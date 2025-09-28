import { getRepoPath } from '@skyreach/cli-kit';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import * as yaml from 'yaml';

const INPUT_DIR = getRepoPath('data', 'trails');
const OUTPUT_FILE = getRepoPath('data', 'trails.yml');

// Hard-coded current season per spec
const CURRENT_SEASON = '1511-autumn' as const;

// --- Types (old & new) ---

type OldTrail = {
  from: string;
  to: string;
  uses?: number;
  isMarked?: boolean;
  lastUsed?: string;
};

type NewTrail = {
  permanent: boolean; // always false for this migration
  streak: number; // derived from hex ranges (a/b/c)
  usedThisSeason: boolean; // lastSeasonTouched === CURRENT_SEASON
  lastSeasonTouched: string; // "YYYY-season"
};

// --- Hex parsing & ordering helpers ---

type Hex = {
  raw: string; // original (lowercased)
  col: string; // letters, lowercased (e.g., 'q')
  row: number; // integer (e.g., 12)
};

const HEX_RE = /^([a-zA-Z]+)(\d+)$/;

function parseHex(input: string): Hex {
  const s = input.trim().toLowerCase();
  const m = s.match(HEX_RE);
  if (!m) {
    throw new Error(`Invalid hex id: "${input}"`);
  }
  const [, col, rowStr] = m;
  const row = parseInt(rowStr, 10);
  if (!Number.isFinite(row)) {
    throw new Error(`Invalid hex row in "${input}"`);
  }
  return { raw: s, col: col.toLowerCase(), row };
}

// Compare by column letters (A→Z), then row number numerically
function compareHex(a: Hex, b: Hex): number {
  if (a.col < b.col) return -1;
  if (a.col > b.col) return 1;
  return a.row - b.row;
}

// Produce directionless canonical pair key "<hexA>-<hexB>"
// where hexA sorts before hexB by compareHex
function canonicalPair(
  aRaw: string,
  bRaw: string,
): { a: Hex; b: Hex; key: string } {
  const a = parseHex(aRaw);
  const b = parseHex(bRaw);
  const first = compareHex(a, b) <= 0 ? a : b;
  const second = first === a ? b : a;
  return { a: first, b: second, key: `${first.raw}-${second.raw}` };
}

// --- Classification rules (a)/(b)/(c) ---

// Rule (a): column in N..S AND row >= 16 (for BOTH endpoints)
const RULE_A_COLS = new Set(['n', 'o', 'p', 'q', 'r', 's']);
const RULE_A_MIN_ROW = 16;

// Rule (b): column in {T,U,V} AND row >= 17 (for BOTH endpoints)
const RULE_B_COLS = new Set(['t', 'u', 'v']);
const RULE_B_MIN_ROW = 17;

function matchesRuleA(h: Hex): boolean {
  return RULE_A_COLS.has(h.col) && h.row >= RULE_A_MIN_ROW;
}
function matchesRuleB(h: Hex): boolean {
  return RULE_B_COLS.has(h.col) && h.row >= RULE_B_MIN_ROW;
}

function classifyPair(
  a: Hex,
  b: Hex,
): Pick<NewTrail, 'streak' | 'lastSeasonTouched' | 'usedThisSeason'> {
  // Apply rules to BOTH endpoints (conservative)
  if (matchesRuleA(a) && matchesRuleA(b)) {
    const lastSeasonTouched = '1511-autumn';
    return {
      streak: 0,
      lastSeasonTouched,
      usedThisSeason: lastSeasonTouched === CURRENT_SEASON,
    };
  }
  if (matchesRuleB(a) && matchesRuleB(b)) {
    const lastSeasonTouched = '1511-spring';
    return {
      streak: 0,
      lastSeasonTouched,
      // @ts-expect-error -- CURRENT_SEASON is "1511-autumn", so this is always false
      usedThisSeason: lastSeasonTouched === CURRENT_SEASON,
    };
  }
  // Default rule (c)
  {
    const lastSeasonTouched = '1511-autumn';
    return {
      streak: 1,
      lastSeasonTouched,
      usedThisSeason: lastSeasonTouched === CURRENT_SEASON,
    };
  }
}

// --- IO helpers ---

async function readYamlFile<T = unknown>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf8');
  return yaml.parse(raw) as T;
}

async function writeYamlFile(filePath: string, data: unknown) {
  const doc = new yaml.Document(data);
  // stable stringification; yaml lib already keeps object key order we provide
  await fs.writeFile(filePath, String(doc), 'utf8');
}

async function listYamlFiles(dir: string): Promise<string[]> {
  const ents = await fs.readdir(dir, { withFileTypes: true });
  return ents
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.yml'))
    .map((e) => path.join(dir, e.name));
}

// --- Main migration ---

async function migrate() {
  // Ensure input dir exists
  await fs.access(INPUT_DIR).catch(() => {
    throw new Error(`Input directory not found: ${INPUT_DIR}`);
  });

  const files = await listYamlFiles(INPUT_DIR);

  const outMap = new Map<string, NewTrail & { _a: Hex; _b: Hex }>();

  for (const file of files) {
    const data = await readYamlFile<OldTrail>(file);

    if (!data?.from || !data?.to) {
      throw new Error(`Missing "from" or "to" in ${file}`);
    }

    const { a, b, key } = canonicalPair(data.from, data.to);

    if (outMap.has(key)) {
      throw new Error(
        `Duplicate canonical trail key "${key}" derived from ${file}`,
      );
    }

    const classified = classifyPair(a, b);

    const row: NewTrail & { _a: Hex; _b: Hex } = {
      permanent: false, // per spec: always false for this migration
      ...classified,
      _a: a,
      _b: b, // keep for sorting; stripped before write
    };

    outMap.set(key, row);
  }

  // Convert to a plain object sorted by (first hex, then second hex) using your hex comparator
  const entries = Array.from(outMap.entries());

  entries.sort((e1, e2) => {
    const v1 = e1[1];
    const v2 = e2[1];
    const c1 = compareHex(v1._a, v2._a);
    if (c1 !== 0) return c1;
    return compareHex(v1._b, v2._b);
  });

  // Build output object in that order; remove the temp _a/_b
  const output: Record<string, NewTrail> = {};
  for (const [key, val] of entries) {
    const { _a, _b, ...clean } = val;
    output[key] = clean;
  }

  // Ensure output directory exists
  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });

  await writeYamlFile(OUTPUT_FILE, output);

  console.log(`Wrote ${entries.length} trails to ${OUTPUT_FILE}`);
}

migrate().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

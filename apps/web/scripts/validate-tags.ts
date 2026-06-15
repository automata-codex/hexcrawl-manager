#!/usr/bin/env tsx
/**
 * Validate Tags
 *
 * Checks every beat's and hex's `tags` against the blessed vocabulary in
 * `data/tags.yaml` (the `beat` and `hex` keys). Off-vocabulary tags are
 * reported grouped by tag, so cleanup is one decision per tag: bless it (add to
 * tags.yaml), collapse it (rename to an existing blessed tag), or drop it
 * (delete; if the info matters, it's body prose).
 *
 * A missing tags.yaml or domain list is treated as an empty vocabulary —
 * every tag is flagged, which makes the first run the triage worklist.
 *
 * Strictness gate: warnings-only by default. Set `ACHM_STRICT_TAGS=1` to
 * fail the build on any off-vocabulary tag. Flip the gate once the cleanup
 * pass is complete.
 *
 * Usage:
 *   tsx scripts/validate-tags.ts
 *   ACHM_STRICT_TAGS=1 tsx scripts/validate-tags.ts
 */

import { resolveDataPath } from '@achm/data';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'yaml';

import {
  analyzeBeatTags,
  analyzeTags,
  formatVocabularyReport,
  parseVocabulary,
  type BeatTagsFile,
  type TaggedItem,
  type VocabularyWarning,
} from './tags-analyzer.js';

function parseFrontmatter<T>(
  content: string,
): { frontmatter: T; body: string } | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (match) {
    try {
      const frontmatter = yaml.parse(match[1]) as T;
      return { frontmatter, body: match[2] ?? '' };
    } catch {
      return null;
    }
  }
  try {
    return { frontmatter: yaml.parse(content) as T, body: '' };
  } catch {
    return null;
  }
}

function loadBeatFiles(plotlinesDir: string): BeatTagsFile[] {
  if (!existsSync(plotlinesDir)) return [];
  const out: BeatTagsFile[] = [];
  for (const entry of readdirSync(plotlinesDir)) {
    const plotlineDir = join(plotlinesDir, entry);
    if (!statSync(plotlineDir).isDirectory()) continue;
    const beatsDir = join(plotlineDir, 'beats');
    if (!existsSync(beatsDir) || !statSync(beatsDir).isDirectory()) continue;
    for (const file of readdirSync(beatsDir)) {
      if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
      const slug = file.replace(/\.(md|mdx)$/, '');
      const raw = readFileSync(join(beatsDir, file), 'utf-8');
      const parsed = parseFrontmatter<{ tags?: string[] }>(raw);
      out.push({
        slug,
        parentPlotlineSlug: entry,
        tags: parsed?.frontmatter.tags,
      });
    }
  }
  return out;
}

/**
 * Load every hex file's id + tags. Hexes live in `data/hexes/` nested under
 * column directories; region-defined hexes without their own file simply have
 * no entry here (and carry no tags), so they are skipped.
 */
function loadHexFiles(hexesDir: string): TaggedItem[] {
  if (!existsSync(hexesDir)) return [];
  const out: TaggedItem[] = [];
  const scan = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(full);
        continue;
      }
      if (!entry.name.endsWith('.yml') && !entry.name.endsWith('.yaml')) {
        continue;
      }
      let data: unknown;
      try {
        data = yaml.parse(readFileSync(full, 'utf-8'));
      } catch {
        continue;
      }
      if (typeof data !== 'object' || data === null) continue;
      const hex = data as { id?: unknown; tags?: unknown };
      if (typeof hex.id !== 'string') continue; // not a hex file
      const tags = Array.isArray(hex.tags)
        ? hex.tags.filter((t): t is string => typeof t === 'string')
        : undefined;
      out.push({ id: hex.id, tags });
    }
  };
  scan(hexesDir);
  return out;
}

function loadTagsDoc(tagsPath: string): unknown {
  if (!existsSync(tagsPath)) {
    console.warn(
      `No tags.yaml found at ${tagsPath} — treating all vocabularies as empty.\n`,
    );
    return null;
  }
  try {
    return yaml.parse(readFileSync(tagsPath, 'utf-8'));
  } catch {
    console.warn(
      `Could not parse ${tagsPath} — treating all vocabularies as empty.\n`,
    );
    return null;
  }
}

function vocabularyFor(doc: unknown, key: string, tagsPath: string): Set<string> {
  if (doc === null) return new Set();
  const list = parseVocabulary(doc, key);
  if (list === null) {
    console.warn(
      `${tagsPath} has no \`${key}\` tag list — treating the ${key} vocabulary as empty.\n`,
    );
    return new Set();
  }
  return new Set(list);
}

/** Report one domain's warnings; returns true if any off-vocabulary tags. */
function reportDomain(
  domain: string,
  warnings: VocabularyWarning[],
  report: string,
): boolean {
  console.log(`Validating ${domain} tags against the blessed vocabulary...\n`);
  if (warnings.length === 0) {
    console.log(`All ${domain} tags are in the blessed vocabulary.\n`);
    return false;
  }
  console.warn(report);
  const useCount = warnings.reduce((n, w) => n + w.ids.length, 0);
  console.warn(
    `${warnings.length} off-vocabulary ${domain} tag(s) across ${useCount} use(s).\n`,
  );
  return true;
}

function main(): void {
  const tagsPath = resolveDataPath('tags.yaml');
  const doc = loadTagsDoc(tagsPath);

  // Beat tags — the beat-flavored wrapper builds the `<plotline>/<beat>` ids,
  // then we adapt to the generic warning shape for a uniform report.
  const beatVocab = vocabularyFor(doc, 'beat', tagsPath);
  const beats = loadBeatFiles(resolveDataPath('plotlines'));
  const beatWarnings: VocabularyWarning[] = analyzeBeatTags(
    beats,
    beatVocab,
  ).map((w) => ({ tag: w.tag, ids: w.beatIds }));
  const beatHasOff = reportDomain(
    'beat',
    beatWarnings,
    formatVocabularyReport(beatWarnings, 'beat'),
  );

  // Hex tags
  const hexVocab = vocabularyFor(doc, 'hex', tagsPath);
  const hexes = loadHexFiles(resolveDataPath('hexes'));
  const hexWarnings = analyzeTags(hexes, hexVocab);
  const hexHasOff = reportDomain(
    'hex',
    hexWarnings,
    formatVocabularyReport(hexWarnings, 'hex'),
  );

  const anyOff = beatHasOff || hexHasOff;
  if (!anyOff) {
    process.exit(0);
  }

  const strict = process.env.ACHM_STRICT_TAGS === '1';
  if (strict) {
    console.error('Strict mode: build fails on off-vocabulary tags.\n');
    process.exit(1);
  }
  console.warn(
    'Build continues. Set ACHM_STRICT_TAGS=1 to fail the build on these.\n',
  );
  process.exit(0);
}

main();

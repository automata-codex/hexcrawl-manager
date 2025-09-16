// migrate-trails.ts
// Usage:
//   ts-node migrate-trails.ts [--dry-run] [--source data/trails] [--out data/trails.yaml]
//
// Behavior:
// - If --source exists and contains *.yml|*.yaml, treat as per-edge files.
// - Else, if out file exists and has trails as an array or map, normalize to map.
// - Writes a backup of existing out file: data/trails.yaml.bak.<ISO>
// - Writes normalized map form: { trails: { "<edgeKey>": { permanent, streak, usedThisSeason, lastSeasonTouched } } }

import fs from "node:fs/promises";
import path from "node:path";

type TrailRec = {
  permanent?: boolean;
  streak?: number;             // 0..3
  usedThisSeason?: boolean;
  lastSeasonTouched?: string;  // normalized season id preferred, but keep as-is if present
};

type TrailsMap = Record<string, TrailRec>;

const YAML = require("yaml");

const argv = (() => {
  const args = process.argv.slice(2);
  const out: Record<string, string | boolean> = { dryRun: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--source") out.source = args[++i];
    else if (a === "--out") out.out = args[++i];
    else throw new Error(`Unknown arg: ${a}`);
  }
  return {
    dryRun: Boolean(out.dryRun),
    sourceDir: (out.source as string) ?? path.join("data", "trails"),
    outFile: (out.out as string) ?? path.join("data", "trails.yaml"),
  };
})();

function parseHexId(raw: string): { col: string; row: number } {
  const s = raw.trim();
  const m = s.match(/^([A-Za-z]+)\s*0*([0-9]+)$/);
  if (!m) {
    // If it's already canonical (e.g., "p13") attempt a fallback:
    const m2 = s.match(/^([a-z]+)-([a-z]+)$/i);
    if (m2) return { col: s.toLowerCase(), row: 0 }; // shouldn't happen; defensive
    throw new Error(`Invalid hex id: "${raw}"`);
  }
  return { col: m[1].toLowerCase(), row: parseInt(m[2], 10) };
}

function edgeKey(a: string, b: string): string {
  const A = parseHexId(a);
  const B = parseHexId(b);
  const cmp =
    A.col < B.col ? -1 :
      A.col > B.col ? 1  :
        A.row - B.row;
  const first = cmp <= 0 ? A : B;
  const second = cmp <= 0 ? B : A;
  return `${first.col}${first.row}-${second.col}${second.row}`;
}

// Heuristic merge: prefer "truthy / higher" values without losing data
function mergeTrailRec(a: TrailRec | undefined, b: TrailRec | undefined): TrailRec {
  if (!a) return { ...b };
  if (!b) return { ...a };
  return {
    permanent: Boolean(a.permanent || b.permanent),
    streak: Math.max(a.streak ?? 0, b.streak ?? 0),
    usedThisSeason: Boolean(a.usedThisSeason || b.usedThisSeason),
    lastSeasonTouched: pickLastSeason(a.lastSeasonTouched, b.lastSeasonTouched),
  };
}

// We can't reliably order arbitrary season strings; prefer a non-empty, or keep 'b' if different.
function pickLastSeason(a?: string, b?: string): string | undefined {
  if (a && !b) return a;
  if (b && !a) return b;
  if (!a && !b) return undefined;
  // If both exist and differ, keep b (later write wins), but keep a if equal
  return b;
}

async function fileExists(fp: string): Promise<boolean> {
  try { await fs.access(fp); return true; } catch { return false; }
}

async function listYamlFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter(e => e.isFile() && /\.(ya?ml)$/i.test(e.name))
      .map(e => path.join(dir, e.name));
  } catch {
    return [];
  }
}

function coerceTrailRec(obj: any): TrailRec {
  const rec: TrailRec = {};
  // Map known variants to the new fields
  if (typeof obj?.permanent === "boolean") rec.permanent = obj.permanent;
  if (typeof obj?.streak === "number") rec.streak = obj.streak;
  if (typeof obj?.usedThisSeason === "boolean") rec.usedThisSeason = obj.usedThisSeason;
  if (typeof obj?.lastSeasonTouched === "string") rec.lastSeasonTouched = obj.lastSeasonTouched;

  // Legacy fields (best-effort)
  if (rec.streak == null && typeof obj?.progress === "number") {
    // some legacy might call it 'progress' (0..3)
    rec.streak = obj.progress;
  }
  if (rec.permanent == null && typeof obj?.isPermanent === "boolean") {
    rec.permanent = obj.isPermanent;
  }
  // Old trail models might have 'uses' or 'isMarked'; these don't map to the new model directly.
  // We intentionally ignore them for migration.

  // Defaults
  if (rec.permanent == null) rec.permanent = false;
  if (rec.streak == null) rec.streak = 0;
  if (rec.usedThisSeason == null) rec.usedThisSeason = false;
  return rec;
}

function extractFromEdgeDoc(doc: any, filename?: string): { key: string; rec: TrailRec } | null {
  // Supported shapes:
  // 1) { from: "p13", to: "q13", permanent?, streak?, usedThisSeason?, lastSeasonTouched? }
  // 2) { edge: ["p13", "q13"], ... }
  // 3) filename like "p13-q13.yaml" with minimal fields inside
  let from = doc?.from;
  let to = doc?.to;
  if (!from || !to) {
    const edgeArr = Array.isArray(doc?.edge) ? doc.edge : undefined;
    if (edgeArr && edgeArr.length === 2) {
      from = edgeArr[0]; to = edgeArr[1];
    }
  }
  if (!from || !to) {
    if (filename) {
      const m = path.basename(filename).match(/^([a-z0-9]+)-([a-z0-9]+)\.ya?ml$/i);
      if (m) { from = m[1]; to = m[2]; }
    }
  }
  if (!from || !to) return null;
  const key = edgeKey(String(from), String(to));
  const rec = coerceTrailRec(doc);
  return { key, rec };
}

async function readYaml(fp: string): Promise<any> {
  const raw = await fs.readFile(fp, "utf8");
  return YAML.parse(raw);
}

async function writeYamlAtomic(fp: string, obj: any) {
  const tmp = fp + ".tmp";
  const data = YAML.stringify(obj, { indent: 2, lineWidth: 0 });
  await fs.writeFile(tmp, data, "utf8");
  await fs.rename(tmp, fp);
}

async function backupIfExists(fp: string) {
  if (await fileExists(fp)) {
    const iso = new Date().toISOString().replace(/[:]/g, "-");
    const bak = `${fp}.bak.${iso}`;
    await fs.copyFile(fp, bak);
    console.log(`Backup written: ${bak}`);
  }
}

async function migrate(): Promise<number> {
  const { sourceDir, outFile, dryRun } = argv;

  const perEdgeFiles = await listYamlFiles(sourceDir);
  const outExists = await fileExists(outFile);

  const merged: TrailsMap = {};

  if (perEdgeFiles.length > 0) {
    console.log(`Found per-edge files in ${sourceDir}: ${perEdgeFiles.length}`);
    for (const fp of perEdgeFiles) {
      try {
        const doc = await readYaml(fp);
        const ext = extractFromEdgeDoc(doc, fp);
        if (!ext) {
          console.warn(`Skipped (no edge found): ${fp}`);
          continue;
        }
        merged[ext.key] = mergeTrailRec(merged[ext.key], ext.rec);
      } catch (e) {
        console.warn(`Failed to parse ${fp}: ${(e as Error).message}`);
      }
    }
  } else if (outExists) {
    console.log(`No per-edge source; normalizing existing ${outFile}…`);
    const doc = await readYaml(outFile);
    if (doc?.trails && Array.isArray(doc.trails)) {
      // Convert array -> map
      for (const item of doc.trails) {
        const ext = extractFromEdgeDoc(item);
        if (!ext) { console.warn(`Skipped array item without edge`); continue; }
        merged[ext.key] = mergeTrailRec(merged[ext.key], ext.rec);
      }
    } else if (doc?.trails && typeof doc.trails === "object") {
      // Already a map; coerce values and rekey to sanitized edgeKey (in case)
      for (const [k, v] of Object.entries<any>(doc.trails)) {
        let key = k;
        // Try to re-derive a canonical key from the entry if possible
        const ext = extractFromEdgeDoc(v as any);
        if (ext) key = ext.key;
        else {
          // Try to interpret key as "p13-q13"
          const parts = k.split("-");
          if (parts.length === 2) key = edgeKey(parts[0], parts[1]);
        }
        merged[key] = mergeTrailRec(merged[key], coerceTrailRec(v));
      }
    } else {
      throw new Error(`Could not find "trails" in ${outFile}, and no per-edge source found.`);
    }
  } else {
    throw new Error(`No per-edge files in ${sourceDir} and ${outFile} does not exist. Nothing to migrate.`);
  }

  const sortedKeys = Object.keys(merged).sort((a, b) => {
    // Sort by first col, first row, then second col, second row
    const pa = a.match(/^([a-z]+)(\d+)-([a-z]+)(\d+)$/)!;
    const pb = b.match(/^([a-z]+)(\d+)-([a-z]+)(\d+)$/)!;
    const ac = pa[1], ar = parseInt(pa[2], 10), bc = pb[1], br = parseInt(pb[2], 10);
    const ad = ac < bc ? -1 : ac > bc ? 1 : ar - br;
    if (ad !== 0) return ad;
    const ac2 = pa[3], ar2 = parseInt(pa[4], 10), bc2 = pb[3], br2 = parseInt(pb[4], 10);
    return ac2 < bc2 ? -1 : ac2 > bc2 ? 1 : ar2 - br2;
  });

  const result = { trails: Object.fromEntries(sortedKeys.map(k => [k, merged[k]])) };

  console.log(`Trails to write: ${sortedKeys.length}`);
  if (argv.dryRun) {
    // Print a compact preview
    for (const k of sortedKeys.slice(0, 20)) {
      console.log(`  ${k}: ${JSON.stringify(merged[k])}`);
    }
    if (sortedKeys.length > 20) console.log(`  ...and ${sortedKeys.length - 20} more`);
    console.log(`(dry-run) No files written.`);
    return 0;
  }

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await backupIfExists(outFile);
  await writeYamlAtomic(outFile, result);
  console.log(`Wrote ${outFile}`);
  return 0;
}

migrate().catch(err => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

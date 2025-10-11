// scripts/build-json-schemas.ts
//
// Usage (dev, no prior build):
//   pnpm dlx tsx scripts/build-json-schemas.ts
// or add to package.json:
//   "build:json": "tsx scripts/build-json-schemas.ts"
//
// Usage (CI, after tsc emits dist):
//   node dist/scripts/build-json-schemas.mjs
//
// Behavior:
// - Tries to import from ../dist/index.js first (CI/normal build).
// - Falls back to ../src/index.ts (dev with tsx).
// - Finds all exports whose names end with "Schema" and look like Zod schemas.
// - Emits kebab-case filenames like `article.schema.json` into ./dist.
// - Also writes a small manifest file: ./dist/schemas.manifest.json

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ZodType } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

type AnyRecord = Record<string, unknown>;

// ---------- config knobs ----------
const DIST_DIR = resolveRelative('../dist');
const DIST_INDEX = resolveRelative('../dist/index.js');
const SRC_INDEX = resolveRelative('../src/index.ts');

// Optionally pin which exports to include via env (comma-separated list):
//   JS_ENTRIES=ArticleSchema,FactionSchema
const PINNED = (process.env.JS_ENTRIES ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// ---------- main ----------
(async () => {
  const Schemas = await loadSchemas();
  await mkdir(DIST_DIR, { recursive: true });

  const entries = enumerateSchemaEntries(Schemas);

  if (entries.length === 0) {
    console.warn(
      '[build-json-schemas] No candidate schemas found. ' +
        "Ensure your index re-exports Zod schemas with names ending in 'Schema'.",
    );
  }

  // Emit each JSON Schema
  for (const { exportName, schema } of entries) {
    const base = exportName.replace(/Schema$/, '');
    // const filename = `${toKebabCase(base)}.schema.json` || `${exportName}.schema.json`;
    const filename = `${toKebabCase(base)}.schema.json`;
    const outputPath = path.join(DIST_DIR, filename);

    // The 'name' helps zod-to-json-schema with $ref names
    const json = zodToJsonSchema(schema as ZodType<any>, {
      name: base || exportName,
    });

    await writeFile(outputPath, JSON.stringify(json, null, 2), 'utf8');
  }

  // Emit a tiny manifest for convenience
  const manifest = {
    generatedAt: new Date().toISOString(),
    count: entries.length,
    entries: entries.map(({ exportName }) => ({
      export: exportName,
      file: `${toKebabCase(exportName.replace(/Schema$/, ''))}.schema.json`,
    })),
  };
  const manifestPath = path.join(DIST_DIR, 'schemas.manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
})().catch((err) => {
  console.error('[build-json-schemas] Failed:', err);
  process.exitCode = 1;
});

// ---------- helpers ----------
async function dynamicImport(p: string): Promise<AnyRecord> {
  const url = pathToFileURL(p).href;
  return (await import(url)) as AnyRecord;
}

function enumerateSchemaEntries(
  mod: AnyRecord,
): Array<{ exportName: string; schema: unknown }> {
  const out: Array<{ exportName: string; schema: unknown }> = [];

  const keys = Object.keys(mod);

  // If JS_ENTRIES is provided, restrict to those names only.
  const candidates =
    PINNED.length > 0 ? keys.filter((k) => PINNED.includes(k)) : keys;

  for (const k of candidates) {
    const v = (mod as AnyRecord)[k];

    // Heuristic: exported name ends with 'Schema' AND looks like a Zod schema
    // (has .safeParse function and internal _def)
    if (!/Schema$/.test(k)) continue;
    if (!looksLikeZodSchema(v)) continue;

    out.push({ exportName: k, schema: v });
  }

  return out;
}

async function loadSchemas(): Promise<AnyRecord> {
  // Prefer compiled output (CI/normal build), fall back to TS source (dev with tsx)
  try {
    return await dynamicImport(DIST_INDEX);
  } catch {
    return await dynamicImport(SRC_INDEX);
  }
}

function looksLikeZodSchema(x: unknown): boolean {
  // zod objects have .safeParse function; many types also expose ._def.typeName
  return !!x && typeof (x as AnyRecord).safeParse === 'function';
}

function resolveRelative(relPath: string): string {
  const here = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(here), relPath);
}

function toKebabCase(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

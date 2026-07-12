#!/usr/bin/env tsx
/**
 * Validate Clue Placement Counts (advisory — non-blocking)
 *
 * Mirrors the placement-count check on the clue index page
 * (session-toolkit/clues/index.astro): a clue's placement count is the number
 * of usage references returned by buildClueUsageMap, and a clue "needs review"
 * when its status is not `known` and its count is below `minPlacements`.
 *
 * This is reporting-only by design: it ALWAYS exits 0 so it can run inside the
 * `set -e` prebuild without blocking a build. It surfaces under-placed clues as
 * advisory warnings, not errors.
 *
 * The counting logic is NOT duplicated here — it imports the same
 * buildClueUsageMap the web app uses, so this stays a single source of truth.
 *
 * Usage:
 *   tsx scripts/validate-clue-placements.ts
 *   npm run validate:placements
 */
import { resolveDataPath } from '@achm/data';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

import { buildClueUsageMap } from '../src/utils/clue-usage-tracker';

const idOf = (file: string): string =>
  path.basename(file).replace(/\.(ya?ml|mdx?)$/, '');

function listFiles(dir: string, exts: string[]): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true })
    .map((entry) => entry.toString())
    .filter((rel) => exts.some((ext) => rel.endsWith(ext)))
    .map((rel) => path.join(dir, rel));
}

function parseYaml(file: string): Record<string, unknown> {
  try {
    return (yaml.parse(readFileSync(file, 'utf-8')) as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

function parseFrontmatter(file: string): Record<string, unknown> {
  try {
    const raw = readFileSync(file, 'utf-8');
    if (!raw.startsWith('---')) return {};
    const end = raw.indexOf('\n---', 3);
    if (end === -1) return {};
    const fm = raw.slice(raw.indexOf('\n') + 1, end);
    return (yaml.parse(fm) as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

function yamlCollection(sub: string) {
  return listFiles(resolveDataPath(sub), ['.yml', '.yaml']).map((file) => {
    const data = parseYaml(file) as { id?: string };
    return { id: data.id ?? idOf(file), data };
  });
}

/**
 * Loads a collection whose entities may be authored as either YAML
 * (`.yml`/`.yaml`) or frontmatter (`.mdx`/`.md`). Pointcrawl nodes are always
 * `.mdx`, and some NPCs/characters are `.mdx`; a YAML-only loader silently drops
 * those files, so the clues they carry vanish from the placement count and the
 * clue reads as under-placed here even though the web app (which loads via Astro
 * content collections) counts them. Parsing both keeps this script in agreement
 * with the UI it mirrors.
 */
function mixedCollection(sub: string) {
  const dir = resolveDataPath(sub);
  const yamlEntries = listFiles(dir, ['.yml', '.yaml']).map((file) => {
    const data = parseYaml(file) as { id?: string };
    return { id: data.id ?? idOf(file), data };
  });
  const frontmatterEntries = listFiles(dir, ['.md', '.mdx']).map((file) => {
    const data = parseFrontmatter(file) as { id?: string };
    return { id: data.id ?? idOf(file), data };
  });
  return [...yamlEntries, ...frontmatterEntries];
}

function frontmatterFiles(sub: string, keepBeats: boolean) {
  const beatSeg = `${path.sep}beats${path.sep}`;
  return listFiles(resolveDataPath(sub), ['.md', '.mdx']).filter((file) =>
    keepBeats ? file.includes(beatSeg) : !file.includes(beatSeg),
  );
}

function main(): void {
  const clues = yamlCollection('clues');
  const encounters = yamlCollection('encounters');
  const hexes = yamlCollection('hexes');
  const pointcrawlNodes = mixedCollection('pointcrawl-nodes');
  const characters = mixedCollection('characters');
  const npcs = mixedCollection('npcs');
  const roleplayBooks = yamlCollection('roleplay-books');

  const dungeons = listFiles(resolveDataPath('dungeons'), ['.md', '.mdx']).map(
    (file) => {
      const data = parseFrontmatter(file) as { id?: string };
      return { id: data.id ?? idOf(file), data };
    },
  );
  const plotlines = frontmatterFiles('plotlines', false).map((file) => {
    const data = parseFrontmatter(file) as { slug?: string };
    return { id: data.slug ?? idOf(file), data };
  });
  const beats = frontmatterFiles('plotlines', true).map((file) => {
    const data = parseFrontmatter(file) as { slug?: string };
    return { id: data.slug ?? idOf(file), data };
  });

  // encounterMap keyed by both collection id and data.id so keyed-encounter
  // lookups resolve regardless of which form the hex references.
  const encounterMap = new Map<string, unknown>();
  for (const e of encounters) {
    encounterMap.set(e.id, e.data);
    const did = (e.data as { id?: string }).id;
    if (did) encounterMap.set(did, e.data);
  }

  const usageMap = buildClueUsageMap(
    encounters as any,
    hexes as any,
    dungeons as any,
    pointcrawlNodes as any,
    encounterMap as any,
    characters as any,
    npcs as any,
    plotlines as any,
    roleplayBooks as any,
    clues as any,
    beats as any,
  );

  const underPlaced = clues
    .map((c) => {
      const data = c.data as {
        minPlacements?: number;
        status?: string;
        name?: string;
      };
      const count = (usageMap.get(c.id) ?? []).length;
      return {
        id: c.id,
        name: data.name ?? c.id,
        count,
        min: data.minPlacements,
        status: data.status ?? 'unknown',
      };
    })
    .filter(
      (r) =>
        r.status !== 'known' && r.min !== undefined && r.count < r.min,
    )
    .sort((a, b) => a.id.localeCompare(b.id));

  console.log(
    `Checked ${clues.length} clue(s) for placement counts (advisory — non-blocking).`,
  );

  if (underPlaced.length === 0) {
    console.log('All clues with a minPlacements floor meet it.\n');
    return;
  }

  console.warn(
    `\n⚠ ${underPlaced.length} clue(s) below minPlacements (advisory only — does not block the build):`,
  );
  for (const r of underPlaced) {
    console.warn(
      `  - ${r.id}: placed ${r.count}/${r.min} (status: ${r.status})`,
    );
  }
  console.warn('');
}

try {
  main();
} catch (err) {
  // Advisory tool: never block the build, even on an internal error.
  console.warn(
    `clue-placement check skipped (non-fatal): ${(err as Error).message}`,
  );
}

process.exit(0);

#!/usr/bin/env tsx
/**
 * Validate Clue / Beat Placement Integrity (strict)
 *
 * The structural invariants from docs/clue-and-beat-placement-guide.md that are
 * NOT already covered elsewhere. Complements two existing checks rather than
 * duplicating them:
 *   - `validate-hex-beat-refs.ts` already resolves hex→beat / hex→book *anchor
 *     arrays* (`landmark.beats` / `hiddenSites[].beats` / `...roleplayBooks`),
 *     so those arrays are read here only to detect double-homes, never
 *     re-reported as dangling.
 *   - `validate-clue-placements.ts` owns placement *counts* (orphans /
 *     minPlacements) via the canonical `buildClueUsageMap`; coverage is not
 *     re-derived here.
 *
 * What this checks (all hard invariants — any finding fails the build):
 *   - Dangling clue references — every clue id referenced from a hex
 *     (landmark/hidden-site clues, hidden-site `clueId`/`linkId`, dream-note
 *     `clueId`), encounter, dungeon, npc, pointcrawl-node, character, beat, or
 *     roleplay-book tidings link resolves to a clue file.
 *   - Dangling beat `linkId` — hidden-site and roleplay-book tidings rows whose
 *     `linkType` is beat must resolve (the link surfaces the anchor-array checks
 *     miss).
 *   - Forbidden back-links — a clue or beat file must not carry a placement
 *     array (`hexes`, `placements`, `locations`, `placedAt`, `hexIds`).
 *   - Double-home beats — a beat anchored on a hex AND surfaced in a
 *     faction-tidings channel is miscategorized (spatial vs. relational).
 *   - Duplicate ids — two clue files sharing an id, or two beats sharing a
 *     canonical `plotlineSlug/beatSlug`.
 *   - Id / slug mismatches — a clue whose `id` differs from its filename, or a
 *     beat whose frontmatter `slug`/`plotline` disagrees with its path.
 *
 * The surface-walking and checks live in `placement-integrity-analyzer.ts`
 * (pure, unit-tested); this file only loads data and sets the exit code.
 *
 * Usage:
 *   tsx scripts/validate-placement-integrity.ts
 *   npm run validate:placement-integrity
 */
import { resolveDataPath } from '@achm/data';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

import {
  analyzePlacementIntegrity,
  formatReport,
  type ParsedFile,
} from './placement-integrity-analyzer.js';

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

const YAML_EXTS = ['.yml', '.yaml'];
const FM_EXTS = ['.md', '.mdx'];

function main(): void {
  const dataRoot = resolveDataPath('');
  const rel = (file: string): string => path.relative(dataRoot, file);

  const yamlCollection = (sub: string): ParsedFile[] =>
    listFiles(resolveDataPath(sub), YAML_EXTS).map((file) => ({ file: rel(file), data: parseYaml(file) }));
  const frontmatterCollection = (dir: string, files = listFiles(dir, FM_EXTS)): ParsedFile[] =>
    files.map((file) => ({ file: rel(file), data: parseFrontmatter(file) }));
  // Entities that may be authored as YAML *or* frontmatter (npcs, characters,
  // pointcrawl nodes) — a YAML-only load silently drops the `.mdx` ones.
  const mixedCollection = (sub: string): ParsedFile[] => [
    ...yamlCollection(sub),
    ...frontmatterCollection(resolveDataPath(sub)),
  ];

  const beatSeg = `${path.sep}beats${path.sep}`;
  const plotlinesDir = resolveDataPath('plotlines');
  const input = {
    clues: yamlCollection('clues'),
    beats: frontmatterCollection(
      plotlinesDir,
      listFiles(plotlinesDir, FM_EXTS).filter((f) => f.includes(beatSeg)),
    ),
    hexes: yamlCollection('hexes'),
    encounters: yamlCollection('encounters'),
    dungeons: frontmatterCollection(resolveDataPath('dungeons')),
    npcs: mixedCollection('npcs'),
    characters: mixedCollection('characters'),
    pointcrawlNodes: mixedCollection('pointcrawl-nodes'),
    roleplayBooks: yamlCollection('roleplay-books'),
  };

  const findings = analyzePlacementIntegrity(input);

  console.log(
    `Checked placement integrity across ${input.clues.length} clue(s), ` +
      `${input.beats.length} beat(s), ${input.roleplayBooks.length} roleplay book(s).`,
  );

  if (findings.length === 0) {
    console.log(formatReport(findings));
    process.exit(0);
  }

  console.error('\n' + formatReport(findings));
  console.error(`${findings.length} placement-integrity finding(s). Build fails.\n`);
  process.exit(1);
}

main();

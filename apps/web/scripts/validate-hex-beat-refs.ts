#!/usr/bin/env tsx
/**
 * Validate Hex → Beat Anchors
 *
 * Every beat ID listed in a hex feature's `beats` array (`landmark.beats` or
 * `hiddenSites[].beats`) must resolve to an existing beat. Beat IDs are
 * canonical `plotlineSlug/beatSlug` references (the `'beat'` LinkType format),
 * e.g. "istavan-and-the-mask/the-refugees-lament".
 *
 * The hex→beat link is one-directional and derived in reverse (there is no
 * `hexes` field on beats). This is the integrity check that keeps those anchors
 * from dangling — the structural counterpart to the clue-reference checks.
 *
 * Strict by default: exits non-zero on any unresolved anchor.
 *
 * Usage:
 *   tsx scripts/validate-hex-beat-refs.ts
 *   npm run validate:hex-beats
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { resolveDataPath } from '@achm/data';
import yaml from 'yaml';

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

/**
 * Set of canonical beat IDs (`plotlineSlug/beatSlug`) across every plotline.
 * Beats live at `data/plotlines/<plotline>/beats/<slug>.{md,mdx}`; the canonical
 * ID prefers the beat's own `plotline` + `slug` frontmatter and falls back to
 * the directory/filename so a beat missing frontmatter still resolves.
 */
function loadBeatIds(): Set<string> {
  const ids = new Set<string>();
  const beatSeg = `${path.sep}beats${path.sep}`;
  for (const file of listFiles(resolveDataPath('plotlines'), ['.md', '.mdx'])) {
    if (!file.includes(beatSeg)) continue;
    const fm = parseFrontmatter(file) as { slug?: string; plotline?: string };
    const slug = fm.slug ?? path.basename(file).replace(/\.(md|mdx)$/, '');
    // Parent plotline dir: data/plotlines/<plotline>/beats/<file>
    const parentPlotline = fm.plotline ?? path.basename(path.dirname(path.dirname(file)));
    ids.add(`${parentPlotline}/${slug}`);
  }
  return ids;
}

interface AnchorRef {
  feature: string;
  beatId: string;
}

/** Pulls every beat anchor off a hex's landmark and object-form hidden sites. */
function beatAnchorsInHex(data: Record<string, unknown>): AnchorRef[] {
  const out: AnchorRef[] = [];

  const pushBeats = (value: unknown, feature: string): void => {
    if (!value || typeof value !== 'object') return;
    const beats = (value as { beats?: unknown }).beats;
    if (!Array.isArray(beats)) return;
    for (const beat of beats) {
      if (typeof beat === 'string') out.push({ feature, beatId: beat });
    }
  };

  pushBeats(data.landmark, 'landmark');

  const sites = data.hiddenSites;
  if (Array.isArray(sites)) {
    sites.forEach((site, i) => pushBeats(site, `hiddenSites[${i}]`));
  }

  return out;
}

function main(): void {
  const beatIds = loadBeatIds();
  const dataRoot = resolveDataPath('');
  const hexFiles = listFiles(resolveDataPath('hexes'), ['.yml', '.yaml']);

  const findings: Array<{ file: string; feature: string; beatId: string }> = [];
  let checked = 0;

  for (const file of hexFiles) {
    for (const anchor of beatAnchorsInHex(parseYaml(file))) {
      checked += 1;
      if (!beatIds.has(anchor.beatId)) {
        findings.push({
          file: path.relative(dataRoot, file),
          feature: anchor.feature,
          beatId: anchor.beatId,
        });
      }
    }
  }

  console.log(
    `Checked ${checked} hex→beat anchor(s) across ${hexFiles.length} hex file(s).`,
  );

  if (findings.length === 0) {
    console.log('All hex→beat anchors resolve.\n');
    process.exit(0);
  }

  console.error(`\n✖ ${findings.length} unresolved hex→beat anchor(s):`);
  for (const f of findings) {
    console.error(
      `  ${f.file}  ${f.feature}.beats → "${f.beatId}" matches no beat ` +
        `(expected canonical plotlineSlug/beatSlug).`,
    );
  }
  console.error('');
  process.exit(1);
}

main();

#!/usr/bin/env tsx
/**
 * Validate Hex → Beat / Roleplay-Book Anchors
 *
 * Every reference listed in a hex feature's anchor arrays must resolve to an
 * existing entity:
 *   - `landmark.beats` / `hiddenSites[].beats` → a beat, identified by its
 *     canonical `plotlineSlug/beatSlug` reference (the `'beat'` LinkType
 *     format), e.g. "istavan-and-the-mask/the-refugees-lament".
 *   - `landmark.roleplayBooks` / `hiddenSites[].roleplayBooks` → a roleplay
 *     book, identified by its `data/roleplay-books/<slug>.yml` file slug, e.g.
 *     "fort-dagaric".
 *
 * Both links are one-directional and derived in reverse (there is no `hexes`
 * field on beats or books). This is the integrity check that keeps those anchors
 * from dangling — the structural counterpart to the clue-reference checks.
 *
 * Strict by default: exits non-zero on any unresolved anchor.
 *
 * Usage:
 *   tsx scripts/validate-hex-beat-refs.ts
 *   npm run validate:hex-beats
 */
import { loadBeats, loadRoleplayBooks, resolveDataPath } from '@achm/data';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
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
    return (
      (yaml.parse(readFileSync(file, 'utf-8')) as Record<string, unknown>) ?? {}
    );
  } catch {
    return {};
  }
}

interface AnchorRef {
  feature: string;
  ref: string;
}

/**
 * Pulls every string entry of a named anchor array (e.g. `beats`,
 * `roleplayBooks`) off a hex's landmark and object-form hidden sites.
 */
function anchorsInHex(
  data: Record<string, unknown>,
  field: string,
): AnchorRef[] {
  const out: AnchorRef[] = [];

  const push = (value: unknown, feature: string): void => {
    if (!value || typeof value !== 'object') return;
    const arr = (value as Record<string, unknown>)[field];
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      if (typeof item === 'string') out.push({ feature, ref: item });
    }
  };

  push(data.landmark, 'landmark');

  const sites = data.hiddenSites;
  if (Array.isArray(sites)) {
    sites.forEach((site, i) => push(site, `hiddenSites[${i}]`));
  }

  return out;
}

/**
 * One reference kind to check. `ids` is the set of resolvable references; each
 * shared `@achm/data` loader validates entities against their schema and skips
 * failures, so a hex anchoring a schema-broken entity is reported here as
 * unresolved — the correct, stricter behavior for an integrity check.
 */
interface AnchorKind {
  field: string;
  ids: Set<string>;
  expected: string;
}

function main(): void {
  const kinds: AnchorKind[] = [
    {
      field: 'beats',
      ids: new Set(loadBeats().keys()),
      expected: 'canonical plotlineSlug/beatSlug',
    },
    {
      field: 'roleplayBooks',
      ids: new Set(loadRoleplayBooks().keys()),
      expected: 'a data/roleplay-books/<slug>.yml file slug',
    },
  ];

  const dataRoot = resolveDataPath('');
  const hexFiles = listFiles(resolveDataPath('hexes'), ['.yml', '.yaml']);

  const findings: Array<{
    file: string;
    feature: string;
    field: string;
    ref: string;
    expected: string;
  }> = [];
  let checked = 0;

  for (const file of hexFiles) {
    const data = parseYaml(file);
    for (const kind of kinds) {
      for (const anchor of anchorsInHex(data, kind.field)) {
        checked += 1;
        if (!kind.ids.has(anchor.ref)) {
          findings.push({
            file: path.relative(dataRoot, file),
            feature: anchor.feature,
            field: kind.field,
            ref: anchor.ref,
            expected: kind.expected,
          });
        }
      }
    }
  }

  console.log(
    `Checked ${checked} hex → beat / roleplay-book anchor(s) across ` +
      `${hexFiles.length} hex file(s).`,
  );

  if (findings.length === 0) {
    console.log('All hex → beat / roleplay-book anchors resolve.\n');
    process.exit(0);
  }

  console.error(`\n✖ ${findings.length} unresolved hex anchor(s):`);
  for (const f of findings) {
    console.error(
      `  ${f.file}  ${f.feature}.${f.field} → "${f.ref}" matches no entity ` +
        `(expected ${f.expected}).`,
    );
  }
  console.error('');
  process.exit(1);
}

main();

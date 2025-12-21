import { hexSort } from '@achm/core';
import { TrailData, TrailsFile } from '@achm/schemas';

import { writeYamlAtomic } from './atomic-write.js';
import { readAndValidateYaml } from './fs-utils.js';
import { REPO_PATHS } from './repo-paths.js';

/** Build a stable edge id by ordering the two hex ids with hexSort. */
export function canonicalTrailId(a: string, b: string): string {
  return hexSort(a, b) <= 0 ? `${a}-${b}` : `${b}-${a}`;
}

/** Load trails with normalized and sorted IDs. */
export function loadTrails(): Record<string, TrailData> {
  const raw = readAndValidateYaml(REPO_PATHS.TRAILS(), TrailsFile);
  return sortTrailKeys(normalizeTrailKeys(raw));
}

/**
 * Normalize all keys to canonical form (e.g., "p12-p13" and "p13-p12" collapse).
 * If duplicates normalize to the same key, the FIRST occurrence wins.
 */
export function normalizeTrailKeys(
  trails: Record<string, TrailData>,
): Record<string, TrailData> {
  const out: Record<string, TrailData> = {};
  for (const [edge, data] of Object.entries(trails)) {
    const [a, b] = edge.split('-');
    if (!a || !b) {
      throw new Error(`Invalid trail edge key: ${edge}`);
    }
    const key = canonicalTrailId(a, b);
    if (!(key in out)) {
      out[key] = data;
    }
  }
  return out;
}

/**
 * Writes the canonical, sorted version of the trails file to disk.
 * Always rewrites the entire file so diffs remain stable.
 */
export function saveTrails(trails: Record<string, TrailData>): void {
  writeYamlAtomic(
    REPO_PATHS.TRAILS(),
    sortTrailKeys(normalizeTrailKeys(trails)),
  );
}

/**
 * Deterministically sort the map by edge id using hex-aware ordering:
 * first by the first hex (hexSort), then by the second hex (hexSort).
 */
export function sortTrailKeys(
  trails: Record<string, TrailData>,
): Record<string, TrailData> {
  const entries = Object.entries(trails);
  entries.sort(([ea], [eb]) => {
    const [a1, a2] = ea.split('-');
    const [b1, b2] = eb.split('-');
    const firstCmp = hexSort(a1, b1);
    return firstCmp !== 0 ? firstCmp : hexSort(a2, b2);
  });
  return Object.fromEntries(entries);
}

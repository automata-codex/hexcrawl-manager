import fs from 'fs';
import path from 'path';

import { parseRolloverDevFilename, parseRolloverFilename } from './filenames.js';
import { REPO_PATHS } from './repo-paths.js';

/** Internal shape for rollover files on disk. */
export type RolloverInfo = {
  file: string;
  base: string;
  seasonId: string; // normalized
};

export type RolloverPathInfo = {
  kind: 'prod' | 'dev';
  seasonId: string; // normalized
  base: string; // filename only
  parentDir: string; // usually 'rollovers'
  grandparentDir: string; // '' | '_dev' | etc.
};

/** Discover all rollover files on disk (both hyphen/underscore tolerated via regex). */
export function discoverRolloverFiles(): RolloverInfo[] {
  const dir = REPO_PATHS.ROLLOVERS();
  if (!fs.existsSync(dir)) {
    return [];
  }
  const out: RolloverInfo[] = [];

  for (const base of fs.readdirSync(dir)) {
    const parsed = parseRolloverFilename(base);
    if (!parsed) continue;
    out.push({ file: path.join(dir, base), base, seasonId: parsed.seasonId });
  }

  // Sort by seasonId lexical (YYYY-season) which corresponds to year then season
  out.sort((a, b) => a.seasonId.localeCompare(b.seasonId));
  return out;
}

/** True if the path is a dev rollover file per storage grammar. */
export function isDevRolloverPath(filePath: string): boolean {
  const info = parseRolloverPath(filePath);
  return !!info && info.kind === 'dev';
}

/** True if the path is a prod rollover file per storage grammar. */
export function isProdRolloverPath(filePath: string): boolean {
  const info = parseRolloverPath(filePath);
  return !!info && info.kind === 'prod';
}

/** True if path is either prod or dev rollover file. */
export function isRolloverPath(
  filePath: string,
  opts?: { includeDev?: boolean },
): boolean {
  const info = parseRolloverPath(filePath);
  if (!info) return false;
  return info.kind === 'prod' || !!opts?.includeDev;
}

/** Parse a path into rollover info if it matches prod/dev rollover shapes and location. */
export function parseRolloverPath(filePath: string): RolloverPathInfo | null {
  const base = path.basename(filePath);
  const parent = path.basename(path.dirname(filePath));
  if (parent !== 'rollovers') return null;

  const grandparent = path.basename(path.dirname(path.dirname(filePath)));

  if (grandparent === '_dev') {
    const parsed = parseRolloverDevFilename(base);
    return parsed
      ? {
          kind: 'dev',
          seasonId: parsed.seasonId,
          base,
          parentDir: parent,
          grandparentDir: grandparent,
        }
      : null;
  }

  const parsed = parseRolloverFilename(base);
  return parsed
    ? {
        kind: 'prod',
        seasonId: parsed.seasonId,
        base,
        parentDir: parent,
        grandparentDir: grandparent,
      }
    : null;
}

import fs from 'fs';
import path from 'path';

import { parseRolloverFilename } from './filenames';
import { REPO_PATHS } from './repo-paths';

/** Internal shape for rollover files on disk. */
export type RolloverInfo = {
  file: string;
  base: string;
  seasonId: string; // normalized
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

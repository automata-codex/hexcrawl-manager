import { normalizeSeasonId } from '@skyreach/core';
import fs from 'fs';
import path from 'path';

import { ROLLOVER_FILE_RE } from './regex';
import { REPO_PATHS } from './repo-paths';

/** Internal shape for rollover files on disk. */
export type RolloverInfo = {
  file: string;
  base: string;
  seasonId: string; // normalized
};

/** Discover all rollover files on disk (both hyphen/underscore tolerated via regex). */
export function discoverRolloverFiles(): RolloverInfo[] {
  const dir = REPO_PATHS.SESSIONS();
  if (!fs.existsSync(dir)) return [];
  const out: RolloverInfo[] = [];

  for (const base of fs.readdirSync(dir)) {
    const m = base.match(ROLLOVER_FILE_RE);
    if (!m) continue;
    const seasonId = normalizeSeasonId(`${m[1]}-${m[2].toLowerCase()}`);
    const file = path.join(dir, base);
    out.push({ file, base, seasonId });
  }

  // Sort by seasonId lexical (YYYY-season) which corresponds to year then season
  out.sort((a, b) => a.seasonId.localeCompare(b.seasonId));
  return out;
}

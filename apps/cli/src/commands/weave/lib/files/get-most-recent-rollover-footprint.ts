import { compareSeasonIds } from '@skyreach/core';
import { REPO_PATHS } from '@skyreach/data';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

/**
 * Find the most recent rollover footprint for a given seasonId (<= that season).
 * Returns the parsed YAML data or null if not found.
 */
export function getMostRecentRolloverFootprint(seasonId: string): any | null {
  let files: string[] = [];
  try {
    files = fs
      .readdirSync(REPO_PATHS.FOOTPRINTS())
      .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map((f) => path.join(REPO_PATHS.FOOTPRINTS(), f));
  } catch {
    return null;
  }

  let best: { seasonId: string; file: string; data: any } | null = null;
  for (const file of files) {
    const data = yaml.parse(fs.readFileSync(file, 'utf8'));
    if (data.kind === 'rollover' && data.seasonId) {
      if (
        !best ||
        (compareSeasonIds(data.seasonId, best.seasonId) > 0 &&
          compareSeasonIds(data.seasonId, seasonId) <= 0)
      ) {
        best = { seasonId: data.seasonId, file, data };
      }
    }
  }
  return best ? best.data : null;
}

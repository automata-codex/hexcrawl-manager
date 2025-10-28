import { REPO_PATHS } from '@skyreach/data';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

/**
 * Get the seasonId of the most recently applied session by reading trails footprints.
 * Returns null if no session footprints exist.
 */
export function getLastAppliedSessionSeason(): string | null {
  let files: string[] = [];
  try {
    const footprintsDir = REPO_PATHS.FOOTPRINTS('trails');
    files = fs
      .readdirSync(footprintsDir)
      .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map((f) => path.join(footprintsDir, f));
  } catch {
    return null;
  }

  // Find all session footprints, sorted by appliedAt timestamp
  const sessionFootprints: Array<{ appliedAt: string; seasonId: string }> = [];

  for (const file of files) {
    try {
      const data = yaml.parse(fs.readFileSync(file, 'utf8'));
      if (data.kind === 'session' && data.seasonId && data.appliedAt) {
        sessionFootprints.push({
          appliedAt: data.appliedAt,
          seasonId: data.seasonId,
        });
      }
    } catch {
      // Skip invalid footprints
      continue;
    }
  }

  if (sessionFootprints.length === 0) {
    return null;
  }

  // Sort by appliedAt descending to get most recent
  sessionFootprints.sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));

  return sessionFootprints[0].seasonId;
}

import { loadMeta, REPO_PATHS } from '@achm/data';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

/**
 * Get the seasonId of the most recently applied session/rollover.
 * First checks meta.state.trails.applied.seasons (explicit rollovers).
 * If empty, falls back to reading session footprints to find the last session's season.
 * Returns null if no sessions or rollovers have been applied.
 */
export function getLastAppliedSessionSeason(): string | null {
  try {
    const meta = loadMeta();
    const seasons = meta.state.trails.applied?.seasons ?? [];

    // If we have rolled seasons, use the most recent one
    if (seasons.length > 0) {
      return seasons[seasons.length - 1];
    }

    // Fall back to checking session footprints
    const footprintsDir = REPO_PATHS.FOOTPRINTS('trails');
    if (!fs.existsSync(footprintsDir)) {
      return null;
    }

    const files = fs
      .readdirSync(footprintsDir)
      .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map((f) => path.join(footprintsDir, f));

    // Find all session footprints, sorted by appliedAt timestamp
    const sessionFootprints: Array<{ appliedAt: string; seasonId: string }> =
      [];

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
  } catch {
    return null;
  }
}

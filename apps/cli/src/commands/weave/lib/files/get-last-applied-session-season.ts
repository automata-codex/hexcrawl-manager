import { loadMeta } from '@skyreach/data';

/**
 * Get the seasonId of the most recently applied (rolled) season from meta.yaml.
 * Returns null if no seasons have been rolled.
 */
export function getLastAppliedSessionSeason(): string | null {
  try {
    const meta = loadMeta();
    const seasons = meta.state.trails.applied?.seasons ?? [];
    if (seasons.length === 0) {
      return null;
    }
    // Seasons are stored in chronological order, return the last one
    return seasons[seasons.length - 1];
  } catch {
    return null;
  }
}

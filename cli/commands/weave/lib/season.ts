import { CALENDAR_CONFIG } from '../../scribe/config/calendar.config';

import type { CanonicalDate } from '../../scribe/types';

const SEASON_ORDER = ['winter', 'spring', 'summer', 'autumn'];

/**
 * Compare two season IDs (e.g., '1511-autumn') for chronological order.
 * Returns -1 if a < b, 1 if a > b, 0 if equal.
 * Sorts by year, then by season order (winter < spring < summer < autumn).
 */
export function compareSeasonIds(a: string, b: string): number {
  const [yearA, seasonA] = normalizeSeasonId(a).split('-');
  const [yearB, seasonB] = normalizeSeasonId(b).split('-');
  const yA = parseInt(yearA, 10);
  const yB = parseInt(yearB, 10);
  if (yA !== yB) {
    return yA - yB;
  }
  const sA = SEASON_ORDER.indexOf(seasonA);
  const sB = SEASON_ORDER.indexOf(seasonB);
  if (sA === -1 || sB === -1) {
    throw new Error(`Invalid season in seasonId: ${a} or ${b}`);
  }
  return sA - sB;
}

/**
 * Derive a season ID (e.g., '1511-autumn') from a CanonicalDate.
 * Always returns lower-case.
 */
export function deriveSeasonId(date: CanonicalDate): string {
  const season = CALENDAR_CONFIG.seasonByMonth[date.month];
  if (!season) {
    throw new Error(`Unknown month: ${date.month}`);
  }
  return `${date.year}-${season}`.toLowerCase();
}

/**
 * Normalize a season ID to lower-case, trimmed.
 */
export function normalizeSeasonId(id: string): string {
  return id.trim().toLowerCase();
}

/**
 * Case-insensitive comparison of season IDs.
 */
export function seasonIdEquals(a: string, b: string): boolean {
  return normalizeSeasonId(a) === normalizeSeasonId(b);
}

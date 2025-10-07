import { CampaignDate, ScribeEvent } from '@skyreach/schemas';

import { CALENDAR_CONFIG } from '../config';
import { DayStartMissingError, SeasonIdError } from '../errors';
import { SEASON_ID_RE } from '../regex';

export const SEASON_ORDER = ['winter', 'spring', 'summer', 'autumn'];

/** Validates and returns a normalized SeasonId (lowercase season). */
export function assertSeasonId(value: string): string {
  const m = value.match(SEASON_ID_RE);
  if (!m) {
    throw new SeasonIdError(value);
  }
  const [, year, season] = m;
  return normalizeSeasonId(`${year}-${season}`);
}

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
 * Derive a season ID (e.g., '1511-autumn') from a CampaignDate.
 * Always returns lower-case.
 */
export function deriveSeasonId(date: CampaignDate): string {
  const season = CALENDAR_CONFIG.seasonByMonth[date.month];
  if (!season) {
    throw new Error(`Unknown month: ${date.month}`);
  }
  return `${date.year}-${season}`.toLowerCase();
}

/** Runtime type guard for SeasonId (case-insensitive, allows normalization). */
export function isSeasonId(value: string): boolean {
  return SEASON_ID_RE.test(value);
}

/**
 * Normalize a season ID to lower-case, trimmed.
 */
export function normalizeSeasonId(id: string): string {
  return id.trim().toLowerCase();
}

export function seasonIdFromEvents(events: ScribeEvent[], fileHint?: string): string {
  const dayStart = events.find((e) => e.kind === 'day_start');
  if (!dayStart) {
    throw new DayStartMissingError(fileHint);
  }
  const calDate = dayStart.payload?.calendarDate as CampaignDate;
  return normalizeSeasonId(deriveSeasonId(calDate));
}

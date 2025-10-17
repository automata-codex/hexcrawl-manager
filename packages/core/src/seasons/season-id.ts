import {
  SEASON_ORDER,
  CampaignDate,
  ScribeEvent,
  Season,
} from '@skyreach/schemas';

import { CALENDAR_CONFIG } from '../config';
import { DayStartMissingError, SeasonIdError } from '../errors';
import { SEASON_ID_RE } from '../regex';

/** Validates and returns a normalized SeasonId (lowercase season). */
export function assertSeasonId(value: string): string {
  const { season, year } = parseSeasonId(value);
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
  const sA = SEASON_ORDER.indexOf(seasonA as Season);
  const sB = SEASON_ORDER.indexOf(seasonB as Season);
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

export function parseSeasonId(seasonId: string) {
  const m = seasonId.match(SEASON_ID_RE);
  if (!m) {
    throw new SeasonIdError(seasonId);
  }
  return { year: Number(m[1]), season: m[2] as Season };
}

export function prevSeasonId(seasonId: string): string {
  const { year, season } = parseSeasonId(seasonId);
  const idx = SEASON_ORDER.indexOf(season);
  const prevIdx = (idx + SEASON_ORDER.length - 1) % SEASON_ORDER.length;
  const prevSeason = SEASON_ORDER[prevIdx];
  const prevYear =
    prevSeason === SEASON_ORDER.at(-1) && season === SEASON_ORDER[0]
      ? year - 1
      : year;
  return normalizeSeasonId(`${prevYear}-${prevSeason}`);
}

export function seasonIdFromEvents(
  events: ScribeEvent[],
  fileHint?: string,
): string {
  const dayStart = events.find((e) => e.kind === 'day_start');
  if (!dayStart) {
    throw new DayStartMissingError(fileHint);
  }
  const calDate = dayStart.payload?.calendarDate as CampaignDate;
  return normalizeSeasonId(deriveSeasonId(calDate));
}

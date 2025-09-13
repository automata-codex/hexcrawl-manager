import type { CanonicalDate, Season } from '../types.ts';
import { CALENDAR_CONFIG } from '../config/calendar.config.ts';

export function datesEqual(a: CanonicalDate | null, b: CanonicalDate | null): boolean {
  if (!a || !b) {
    return false;
  }
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function getSeasonForDate(date: CanonicalDate): Season {
  return CALENDAR_CONFIG.seasonByMonth[date.month] as Season;
}

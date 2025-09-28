import { CALENDAR_CONFIG } from '../config/calendar.config.ts';

import type { Season } from '../types.ts';
import type { CampaignDate } from '@skyreach/schemas';

export function datesEqual(
  a: CampaignDate | null,
  b: CampaignDate | null,
): boolean {
  if (!a || !b) {
    return false;
  }
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function getSeasonForDate(date: CampaignDate): Season {
  return CALENDAR_CONFIG.seasonByMonth[date.month] as Season;
}

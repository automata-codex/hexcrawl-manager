import { CALENDAR_CONFIG } from '@skyreach/core';

import type { CampaignDate } from '@skyreach/schemas';
import type { Season } from '@skyreach/core';

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

import { STEP_HOURS } from '@skyreach/schemas';

import { getDaylightCapForSeason } from './get-daylight-cap-for-season';
import { getSeasonForDate } from './get-season-for-date';

import type { CampaignDate } from '@skyreach/schemas';

/**
 * Get the daylight cap for a given date, converted to segments (0.5h increments).
 */
export function getDaylightCapSegments(date: CampaignDate): number {
  const season = getSeasonForDate(date);
  const hours = getDaylightCapForSeason(season);
  return Math.round(hours / STEP_HOURS);
}

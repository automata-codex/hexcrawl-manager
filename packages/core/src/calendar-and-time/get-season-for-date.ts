import { CALENDAR_CONFIG } from '../config';

import type { Season } from '../types';
import type { CampaignDate } from '@skyreach/schemas';

export function getSeasonForDate(date: CampaignDate): Season {
  return CALENDAR_CONFIG.seasonByMonth[date.month] as Season;
}

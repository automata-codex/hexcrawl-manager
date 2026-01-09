import { CALENDAR_CONFIG } from '../config/index.js';

import type { Season } from '../types.js';
import type { CampaignDate } from '@achm/schemas';

export function getSeasonForDate(date: CampaignDate): Season {
  return CALENDAR_CONFIG.seasonByMonth[date.month] as Season;
}

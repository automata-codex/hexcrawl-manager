import { CALENDAR_CONFIG } from '../config/index.js';
import { Season } from '../types.js';

export function getDaylightCapForSeason(season: Season): number {
  return CALENDAR_CONFIG.daylightCaps[season];
}

import { CALENDAR_CONFIG } from '../config';
import { Season } from '../types';

export function getDaylightCapForSeason(season: Season): number {
  return CALENDAR_CONFIG.daylightCaps[season];
}

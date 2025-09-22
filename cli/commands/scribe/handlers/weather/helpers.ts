import { CALENDAR_CONFIG } from '../../config/calendar.config.ts';
import { DESCRIPTOR_LIBRARY } from '../../config/descriptor-library.config.ts';
import { DETAIL_TABLES } from '../../config/detail-tables.config.ts';
import { EFFECTS_TABLE } from '../../config/effects-table.config.ts';
import { FORECAST_MODIFIER } from '../../config/forecast-modifier.config.ts';
import { SEASONAL_BANDS } from '../../config/seasonal-bands.config.ts';
import { clamp, rollDice } from '../../lib/math.ts';

import type { Season, WeatherCategory, CanonicalDate } from '../../types.ts';

export function bandForTotal(season: Season, total: number): WeatherCategory {
  const bands = SEASONAL_BANDS[season];
  for (const band of bands) {
    if (total >= band.range[0] && total <= band.range[1]) {
      return band.category;
    }
  }
  return bands[0].category;
}

export function descriptorsFor(
  season: Season,
  category: WeatherCategory,
): string[] {
  return DESCRIPTOR_LIBRARY[season][category];
}

export function detailRoll(season: Season): string | undefined {
  const table = DETAIL_TABLES[season];
  const roll = rollDice(table.die);
  return table.entries[roll];
}

export function effectsForCategory(category: WeatherCategory) {
  return EFFECTS_TABLE[category];
}

export function forecastAfterForCategory(category: WeatherCategory): number {
  return clamp(FORECAST_MODIFIER[category], -1, 5);
}

export function getSeasonForDate(date: CanonicalDate): Season {
  return CALENDAR_CONFIG.seasonByMonth[date.month] as Season;
}

export function isInclementPlus(category: WeatherCategory): boolean {
  return ['inclement', 'extreme', 'catastrophic'].includes(category);
}

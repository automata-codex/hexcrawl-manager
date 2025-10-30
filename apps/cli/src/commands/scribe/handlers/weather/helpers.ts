import { CALENDAR_CONFIG, rollDice } from '@skyreach/core';
import { clamp } from 'lodash-es';

import { DESCRIPTOR_LIBRARY } from '../../config/descriptor-library.config';
import { DETAIL_TABLES } from '../../config/detail-tables.config';
import { EFFECTS_TABLE } from '../../config/effects-table.config';
import { FORECAST_MODIFIER } from '../../config/forecast-modifier.config';
import { SEASONAL_BANDS } from '../../config/seasonal-bands.config';

import type { Season, WeatherCategory } from '@skyreach/core';
import type { CampaignDate } from '@skyreach/schemas';

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

export function getSeasonForDate(date: CampaignDate): Season {
  return CALENDAR_CONFIG.seasonByMonth[date.month] as Season;
}

export function isInclementPlus(category: WeatherCategory): boolean {
  return ['inclement', 'extreme', 'catastrophic'].includes(category);
}

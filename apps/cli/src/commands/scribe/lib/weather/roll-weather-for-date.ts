import { rollDice } from '@achm/core';
import { clamp } from 'lodash-es';

import {
  bandForTotal,
  detailRoll,
  forecastAfterForCategory,
  getSeasonForDate,
  isInclementPlus,
} from '../../handlers/weather/helpers';

import type { CampaignDate, WeatherCommittedEventPayload } from '@achm/schemas';

/**
 * Roll and resolve a committed-weather payload for a given date, with no GM
 * interaction. This mirrors `weather roll` followed immediately by `weather
 * commit` with no overrides: the proposed category/detail are taken as-is and
 * no descriptors are selected (`weather commit` omits them unless `weather use`
 * picked some).
 *
 * Pure except for the dice roll. Used by fast travel to auto-commit weather on
 * each day of a multi-day journey.
 *
 * @param date The date to roll weather for
 * @param forecastBefore Carried-over forecast modifier from the prior day (0 if none)
 */
export function rollWeatherForDate(
  date: CampaignDate,
  forecastBefore: number,
): WeatherCommittedEventPayload {
  const season = getSeasonForDate(date);
  const roll2d6 = rollDice('2d6');
  const total = clamp(roll2d6 + forecastBefore, 2, 17);
  const category = bandForTotal(season, total);
  const detail = isInclementPlus(category)
    ? (detailRoll(season) ?? null)
    : null;
  const forecastAfter = forecastAfterForCategory(category); // already clamped to [-1, 5]

  return {
    date,
    season,
    roll2d6,
    forecastBefore,
    total,
    category,
    detail,
    forecastAfter,
  };
}

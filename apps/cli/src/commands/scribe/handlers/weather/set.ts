import { info, error } from '@achm/cli-kit';
import { WEATHER_CATEGORIES } from '@achm/schemas';
import { clamp } from 'lodash-es';

import {
  bandForTotal,
  descriptorsFor,
  effectsForCategory,
  isInclementPlus,
} from './helpers';

import type { Context } from '../../types.ts';
import type { Season, WeatherDraft } from '@achm/core';

export default function weatherSet(ctx: Context, args: string[]) {
  const draft: WeatherDraft | undefined = ctx.weatherDraft;
  if (!draft) {
    error('No weather draft to set. Run `weather roll` first.');
    return;
  }
  if (args.length < 3) {
    error('Usage: weather set <field> <value>');
    return;
  }
  const field = args[1].toLowerCase();
  const value = args.slice(2).join(' ');

  switch (field) {
    // Presentation fields: update only overrides
    case 'category': {
      const normalized = value.trim().toLowerCase();
      const matched = WEATHER_CATEGORIES.find(
        (cat) => cat.toLowerCase() === normalized,
      );
      if (!matched) {
        error(
          `Invalid category '${value}'. Allowed: ${WEATHER_CATEGORIES.join(', ')}`,
        );
        return;
      }
      draft.overrides.category = matched;
      info(`Override category set to '${matched}'.`);
      break;
    }
    case 'desc': {
      if (!draft.overrides.descriptors) {
        draft.overrides.descriptors = [];
      }
      if (!draft.overrides.descriptors.includes(value)) {
        draft.overrides.descriptors.push(value);
        info(`Descriptor '${value}' added to overrides.`);
      } else {
        info(`Descriptor '${value}' already present in overrides.`);
      }
      break;
    }
    case 'detail': {
      draft.overrides.detail = value;
      info(`Override detail set to '${value}'.`);
      break;
    }
    // Core fields: update only proposed and recompute chain
    case 'forecast': {
      const forecast = Number(value);
      if (isNaN(forecast) || forecast < -1 || forecast > 5) {
        error('Forecast must be a number between -1 and 5.');
        return;
      }
      draft.proposed.forecastBefore = forecast;
      draft.proposed.total = clamp(draft.proposed.roll2d6 + forecast, 2, 17);
      draft.proposed.category = bandForTotal(
        draft.proposed.season,
        draft.proposed.total,
      );
      draft.proposed.detail = isInclementPlus(draft.proposed.category)
        ? draft.proposed.detail
        : undefined;
      draft.proposed.suggestedDescriptors = descriptorsFor(
        draft.proposed.season,
        draft.proposed.category,
      );
      draft.proposed.effects = effectsForCategory(draft.proposed.category);
      info(`Proposed forecast set to ${forecast}.`);
      break;
    }
    case 'roll': {
      const roll = Number(value);
      if (isNaN(roll) || roll < 2 || roll > 12) {
        error('Roll must be a number between 2 and 12.');
        return;
      }
      draft.proposed.roll2d6 = roll;
      draft.proposed.total = clamp(roll + draft.proposed.forecastBefore, 2, 17);
      draft.proposed.category = bandForTotal(
        draft.proposed.season,
        draft.proposed.total,
      );
      draft.proposed.detail = isInclementPlus(draft.proposed.category)
        ? draft.proposed.detail
        : undefined;
      draft.proposed.suggestedDescriptors = descriptorsFor(
        draft.proposed.season,
        draft.proposed.category,
      );
      draft.proposed.effects = effectsForCategory(draft.proposed.category);
      info(`Proposed roll set to ${roll}.`);
      break;
    }
    case 'season': {
      const season = value as Season;
      draft.proposed.season = season;
      draft.proposed.total = clamp(
        draft.proposed.roll2d6 + draft.proposed.forecastBefore,
        2,
        17,
      );
      draft.proposed.category = bandForTotal(season, draft.proposed.total);
      draft.proposed.detail = isInclementPlus(draft.proposed.category)
        ? draft.proposed.detail
        : undefined;
      draft.proposed.suggestedDescriptors = descriptorsFor(
        season,
        draft.proposed.category,
      );
      draft.proposed.effects = effectsForCategory(draft.proposed.category);
      info(`Proposed season set to '${season}'.`);
      break;
    }
    default:
      error(
        `Unknown field '${field}'. Allowed fields: season, roll, forecast, category, detail, desc.`,
      );
      return;
  }
}

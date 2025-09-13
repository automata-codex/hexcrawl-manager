import type { Context, WeatherDraft, Season, WeatherCategory } from '../../types.ts';
import { info, error } from '../../lib/report.ts';
import {
  bandForTotal,
  descriptorsFor,
  effectsForCategory,
} from './helpers.ts';
import { clamp } from '../../lib/math.ts';

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
    case 'category': {
      const category = value as WeatherCategory;
      draft.category = category;
      const suggested = bandForTotal(draft.season, draft.total);
      draft.override = category !== suggested;
      draft.effects = effectsForCategory(category);
      draft.suggestedDescriptors = descriptorsFor(draft.season, category);
      info(`Draft category set to '${category}'.`);
      break;
    }
    case 'desc': {
      if (!draft.descriptors) draft.descriptors = [];
      if (!draft.descriptors.includes(value)) {
        draft.descriptors.push(value);
        info(`Descriptor '${value}' added to draft.`);
      } else {
        info(`Descriptor '${value}' already present.`);
      }
      break;
    }
    case 'detail': {
      draft.detail = value;
      info(`Draft detail set to '${value}'.`);
      break;
    }
    case 'forecast': {
      const forecast = Number(value);
      if (isNaN(forecast) || forecast < -1 || forecast > 5) {
        error('Forecast must be a number between -1 and 5.');
        return;
      }
      draft.forecastBefore = forecast;
      draft.total = clamp(draft.roll2d6 + forecast, 2, 17);
      const suggested = bandForTotal(draft.season, draft.total);
      draft.override = draft.category !== suggested;
      draft.effects = effectsForCategory(draft.category);
      draft.suggestedDescriptors = descriptorsFor(draft.season, draft.category);
      info(`Draft forecast set to ${forecast}.`);
      break;
    }
    case 'roll': {
      const roll = Number(value);
      if (isNaN(roll) || roll < 2 || roll > 12) {
        error('Roll must be a number between 2 and 12.');
        return;
      }
      draft.roll2d6 = roll;
      draft.total = clamp(roll + draft.forecastBefore, 2, 17);
      const suggested = bandForTotal(draft.season, draft.total);
      draft.override = draft.category !== suggested;
      draft.effects = effectsForCategory(draft.category);
      draft.suggestedDescriptors = descriptorsFor(draft.season, draft.category);
      info(`Draft roll set to ${roll}.`);
      break;
    }
    case 'season': {
      const season = value as Season;
      draft.season = season;
      draft.total = clamp(draft.roll2d6 + draft.forecastBefore, 2, 17);
      const suggested = bandForTotal(season, draft.total);
      draft.override = draft.category !== suggested;
      draft.effects = effectsForCategory(draft.category);
      draft.suggestedDescriptors = descriptorsFor(season, draft.category);
      info(`Draft season set to '${season}'.`);
      break;
    }
    default:
      error(`Unknown field '${field}'. Allowed fields: season, roll, forecast, category, detail, desc.`);
      return;
  }
}


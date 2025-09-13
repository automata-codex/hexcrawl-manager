import type { Context, WeatherDraft } from '../../types.ts';
import { info, error } from '../../lib/report.ts';
import { appendEvent } from '../../services/event-log.ts';
import { forecastAfterForCategory, bandForTotal, getSeasonForDate } from './helpers.ts';
import { clamp } from '../../lib/math.ts';
import { requireFile } from '../../lib/guards.ts';

export default function weatherCommit(ctx: Context) {
  if (!requireFile(ctx)) {
    return;
  }

  const draft: WeatherDraft | undefined = ctx.weatherDraft;
  if (!draft) {
    error('No weather draft to commit. Run `weather roll` first.');
    return;
  }

  // Validate required fields
  if (!draft.season) {
    draft.season = getSeasonForDate(draft.date);
  }
  if (draft.roll2d6 == null || draft.forecastBefore == null || draft.category == null) {
    error('Draft is missing required fields.');
    return;
  }

  // Compute total and forecastAfter
  const total = clamp(draft.roll2d6 + draft.forecastBefore, 2, 17);
  const expectedCategory = bandForTotal(draft.season, total);
  const override = draft.category !== expectedCategory; // TODO Revisit this logic after implementing the `set` subcommand
  const forecastAfter = forecastAfterForCategory(draft.category);

  // Write event
  appendEvent(ctx.file!, 'weather_committed', { // Checked by `requireFile`
    date: draft.date,
    season: draft.season,
    roll2d6: draft.roll2d6,
    forecastBefore: draft.forecastBefore,
    total,
    category: draft.category,
    detail: draft.detail,
    forecastAfter,
    override,
  });

  ctx.weatherDraft = undefined;
  info('Weather committed for today.');
}


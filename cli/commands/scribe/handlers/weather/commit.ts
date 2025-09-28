import { info, error } from '@skyreach/cli-kit';
import { appendEvent } from '../../services/event-log.ts';

import type { Context } from '../../types.ts';
import type { WeatherDraft } from '@skyreach/core';
import { clamp } from '@skyreach/cli-kit';
import { requireFile } from '../../services/general.ts';

export default function weatherCommit(ctx: Context) {
  if (!requireFile(ctx)) {
    return;
  }

  const draft: WeatherDraft | undefined = ctx.weatherDraft;
  if (!draft) {
    error('No weather draft to commit. Run `weather roll` first.');
    return;
  }

  // Resolve presentation fields
  const finalCategory = draft.overrides.category ?? draft.proposed.category;
  const finalDetail = draft.overrides.detail ?? draft.proposed.detail ?? null;
  const finalDescriptors =
    draft.overrides.descriptors && draft.overrides.descriptors.length > 0
      ? draft.overrides.descriptors
      : undefined;

  // Clamp forecastAfter
  const forecastAfter = clamp(draft.proposed.forecastModifier, -1, 5);

  // Write event
  appendEvent(ctx.file!, 'weather_committed', {
    date: draft.date,
    season: draft.proposed.season,
    roll2d6: draft.proposed.roll2d6,
    forecastBefore: draft.proposed.forecastBefore,
    total: draft.proposed.total,
    category: finalCategory,
    detail: finalDetail,
    descriptors: finalDescriptors,
    forecastAfter,
  });

  ctx.weatherDraft = undefined;
  info('Weather committed for today.');
}

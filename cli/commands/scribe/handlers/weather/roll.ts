import { rollDice, clamp } from '../../lib/math.ts';
import { requireFile, requireSession } from '../../lib/guards.ts';
import { lastCalendarDate, selectCurrentForecast } from '../../projectors.ts';
import { info } from '../../lib/report.ts';
import { readEvents } from '../../services/event-log.ts';
import type { Context, WeatherDraft, CanonicalDate, Season } from '../../types.ts';

import {
  bandForTotal,
  descriptorsFor,
  detailRoll,
  effectsForCategory,
  isInclementPlus,
  getSeasonForDate,
} from './helpers.ts';

export default function weatherRoll(ctx: Context) {
  if (!requireSession(ctx)) {
    return;
  }
  if (!requireFile(ctx)) {
    return;
  }
  const events = readEvents(ctx.file!); // Checked by `requireFile`

  // 1. Get today's date
  const date: CanonicalDate | null = lastCalendarDate(events);
  if (!date) {
    info('No current date found. Start a day first.');
    return;
  }

  // 2. Get season
  const season: Season = getSeasonForDate(date);

  // 3. Roll 2d6
  const roll = rollDice('2d6');

  // 4. Get forecastBefore
  const forecastBefore = selectCurrentForecast(events);

  // 5. Compute total
  const total = clamp(roll + forecastBefore, 2, 17);

  // 6. Get category
  const category = bandForTotal(season, total);

  // 7. Get detail if Inclement+
  let detail: string | undefined = undefined;
  if (isInclementPlus(category)) {
    detail = detailRoll(season);
  }

  // 8. Get descriptors
  const suggestedDescriptors = descriptorsFor(season, category);

  // 9. Get effects
  const effects = effectsForCategory(category);

  // 10. Store draft in context
  ctx.weatherDraft = {
    category,
    date,
    detail,
    effects,
    forecastBefore,
    override: false,
    roll2d6: roll,
    season,
    suggestedDescriptors,
    total,
  } satisfies WeatherDraft;

  // 11. Print summary
  info(
    `Weather draft (today): roll=${roll}, forecast=+${forecastBefore} → total=${total} → ${category} (×${effects.travelMultiplier} travel)`
  );
  info(
    `Descriptors: [1] ${suggestedDescriptors[0]} • [2] ${suggestedDescriptors[1]} • [3] ${suggestedDescriptors[2]}`
  );
  info(`Use 'weather use 1,3' or 'weather set ...', then 'weather commit'.`);
}


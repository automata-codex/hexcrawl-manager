import { datesEqual } from '../lib/date.ts';
import { warn } from '../lib/report.ts';
import { lastCalendarDate, selectCurrentWeather } from '../projectors.ts';
import { readEvents } from '../services/event-log.ts';

import type { Context, CanonicalDate, WeatherCommitted } from '../types';

/** Prints the weather nag if needed, once per in-game day. */
export default function weatherNag(ctx: Context, cmd: string) {
  if (cmd === 'weather') {
    return; // Don't nag if the user just ran the weather command
  }
  if (!ctx.file) {
    // Fail silently instead of printing the standard error message from the `requireFile` guard
    return;
  }

  const events = readEvents(ctx.file);

  // Get today's date
  const today: CanonicalDate | null = lastCalendarDate(events);
  if (!today) {
    return;
  }

  // Track which dates have been nagged
  if (!ctx.weatherNagPrintedForDates) {
    ctx.weatherNagPrintedForDates = new Set();
  }
  const key = JSON.stringify(today);
  if (ctx.weatherNagPrintedForDates.has(key)) {
    return;
  }

  // Check for committed weather for today
  let hasCommitted = false;
  const committed: WeatherCommitted | null = selectCurrentWeather(events);
  if (committed && datesEqual(committed.date, today)) {
    hasCommitted = true;
  }

  // Check for draft for today
  const draft = ctx.weatherDraft;
  const hasDraft = draft && datesEqual(draft.date, today);

  if (!hasCommitted && !hasDraft) {
    warn('⚠️ No weather yet for today. Run `weather roll`.');
    ctx.weatherNagPrintedForDates.add(key);
    return;
  }
  if (!hasCommitted && hasDraft) {
    warn('⚠️ Weather draft exists. Run `weather commit` or `weather abandon`.');
    ctx.weatherNagPrintedForDates.add(key);
    return;
  }
}

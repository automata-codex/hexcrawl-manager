import { requireFile } from '../../lib/guards.ts';
import { info } from '../../lib/report.ts';
import { selectCurrentWeather } from '../../projectors.ts';
import { readEvents } from '../../services/event-log.ts';
import type { Context, WeatherDraft, WeatherCommitted } from '../../types.ts';

function printCommitted(committed: WeatherCommitted) {
  info(`Committed Weather:`);
  info(`  Date: ${committed.date.year}-${committed.date.month}-${committed.date.day}`);
  info(`  Season: ${committed.season}`);
  info(`  Roll: ${committed.roll2d6}`);
  info(`  Forecast: ${committed.forecastBefore}`);
  info(`  Total: ${committed.total}`);
  info(`  Category: ${committed.category}`);
  if (committed.detail) {
    info(`  Detail: ${committed.detail}`);
  }
  if (committed.descriptors && committed.descriptors.length) {
    printDescriptors(committed.descriptors, 'Descriptors');
  }
  info(`  Forecast After: ${committed.forecastAfter}`);
}

function printDescriptors(descriptors: string[], label: string) {
  if (!descriptors || descriptors.length === 0) {
    return;
  }
  info(`${label}: ${descriptors.map((d, i) => `[${i + 1}] ${d}`).join(' • ')}`);
}

function printDraft(draft: WeatherDraft) {
  const p = draft.proposed;
  info(`Proposed:`);
  info(`  Season: ${p.season}`);
  info(`  Roll: ${p.roll2d6}`);
  info(`  Forecast: ${p.forecastBefore}`);
  info(`  Total: ${p.total}`);
  info(`  Category: ${p.category}`);
  if (p.detail) {
    info(`  Detail: ${p.detail}`);
  }
  printEffects(p.effects);
  printDescriptors(p.suggestedDescriptors, 'Suggestions');
  const o = draft.overrides;
  if (o.category || o.detail || (o.descriptors && o.descriptors.length)) {
    info(`Overrides:`);
    if (o.category) {
      info(`  Category: ${o.category}`);
    }
    if (o.detail) {
      info(`  Detail: ${o.detail}`);
    }
    if (o.descriptors && o.descriptors.length) {
      printDescriptors(o.descriptors, 'Chosen');
    }
  }
}

function printEffects(effects: WeatherDraft['proposed']['effects']) {
  info(`Effects: travel ×${effects.travelMultiplier}, nav: ${effects.navCheck}, exhaustion: ${effects.exhaustionOnTravel ? 'yes' : 'no'}`);
}

export default function weatherShow(ctx: Context) {
  if (!requireFile(ctx)) {
    return;
  }

  const events = readEvents(ctx.file!); // checked by `requireFile`
  const committed = selectCurrentWeather(events);
  const draft = ctx.weatherDraft;

  if (!draft && !committed) {
    info(`⚠️ No weather yet for today. Run 'weather roll'.`);
    return;
  }

  if (draft) {
    printDraft(draft);
    if (!committed) {
      info(`⚠️ Weather draft exists. Run 'weather commit' or 'weather abandon'.`);
    }
  }

  if (committed) {
    printCommitted(committed);
  }
}

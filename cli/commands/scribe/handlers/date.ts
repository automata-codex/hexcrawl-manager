import type { Context, Event } from '../types';
import { readEvents, appendEvent } from '../services/event-log';
import { info, usage, error } from '../lib/report';
import { requireFile } from '../lib/guards.ts';

function lastCalendarDate(events: Event[]) {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.kind === 'day_start' || e.kind === 'date_set') {
      return (e as any).payload?.calendarDate ?? null;
    }
  }
  return null;
}

export default function date(ctx: Context) {
  return (args: string[]) => {
    if (!requireFile(ctx)) {
      return;
    }
    if (args.length === 0) {
      return usage('usage: date <new date>');
    }

    const input = args.join(' ').trim();
    const events = readEvents(ctx.file!); // Checked by `requireFile`

    let calendarDate;
    try {
      calendarDate = ctx.calendar.parseDate(input, lastCalendarDate(events));
    } catch (e: any) {
      return error(`Invalid date. ${e?.message ?? ''}`);
    }

    appendEvent(ctx.file!, 'date_set', { calendarDate }); // Checked by `requireFile`
    return info(`📅 Date set to ${ctx.calendar.formatDate(calendarDate)}`);
  };
}

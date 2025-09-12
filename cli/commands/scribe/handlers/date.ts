import { lastCalendarDate } from '../lib/day.ts';
import { requireFile } from '../lib/guards.ts';
import { info, usage, error } from '../lib/report';
import { readEvents, appendEvent } from '../services/event-log';
import type { Context, Event } from '../types';

function isDayOpen(events: Event[]) {
  let lastStartIdx = -1;
  let lastEndIdx = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    const k = events[i].kind;
    if (k === 'day_end' && lastEndIdx === -1) {
      lastEndIdx = i;
    }
    if (k === 'day_start' && lastStartIdx === -1) {
      lastStartIdx = i;
    }
    if (lastStartIdx !== -1 && lastEndIdx !== -1) {
      break;
    }
  }
  return lastStartIdx !== -1 && (lastEndIdx === -1 || lastStartIdx > lastEndIdx);
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

    // Require an open day before allowing date changes
    if (!isDayOpen(events)) {
      return error('❌ No open day. Start one with: day start [date]');
    }

    let calendarDate;
    try {
      calendarDate = ctx.calendar.parseDate(input, lastCalendarDate(events));
    } catch (e: any) {
      return error(`Invalid date. ${e?.message ?? ''}`);
    }

    appendEvent(ctx.file!, 'date_set', {calendarDate}); // Checked by `requireFile`
    return info(`📅 Date set to ${ctx.calendar.formatDate(calendarDate)}`);
  };
}

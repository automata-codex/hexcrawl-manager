import { info, usage, error } from '@skyreach/cli-kit';

import { isDayOpen, lastCalendarDate } from '../projectors.ts';
import { readEvents, appendEvent } from '../../../src/services/event-log';
import { requireFile } from '../services/general.ts';

import type { Context } from '../types';

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

    appendEvent(ctx.file!, 'date_set', { calendarDate }); // Checked by `requireFile`
    return info(`📅 Date set to ${ctx.calendar.formatDate(calendarDate)}`);
  };
}

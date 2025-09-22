import { CALENDAR_CONFIG } from '../config/calendar.config.ts';
import { segmentsToHours } from '../lib/day.ts';
import { requireFile, requireSession } from '../lib/guards.ts';
import { info, warn, usage, error } from '../lib/report';
import { findOpenDay, lastCalendarDate } from '../projectors.ts';
import { readEvents, appendEvent } from '../services/event-log';

import type { CanonicalDate, Context } from '../types';

export default function day(ctx: Context) {
  return (args: string[]) => {
    if (!requireSession(ctx)) {
      return;
    }
    if (!requireFile(ctx)) {
      return;
    }

    const sub = (args[0] || '').toLowerCase();
    if (sub !== 'start' && sub !== 'end') {
      return usage('usage: day <start [date]|end>');
    }

    const events = readEvents(ctx.file!); // Checked by `requireFile`
    const { open } = findOpenDay(events);

    if (sub === 'start') {
      if (open) {
        return warn(
          'A day is already open. Use `day end` (or `rest`) before starting a new day.',
        );
      }

      // Parse/resolve date
      const dateArg = args.slice(1).join(' ').trim(); // may be empty
      let calendarDate: CanonicalDate | null = null;

      try {
        if (dateArg) {
          // Accept full/partial/relative; delegate to your calendar service.
          // Replace with your actual API (e.g., ctx.calendar.parse(dateArg))
          calendarDate = ctx.calendar.parseDate(dateArg);
        } else {
          const last = lastCalendarDate(events);
          if (!last) {
            return usage('usage: day start <date>  (no prior date found)');
          }
          calendarDate = ctx.calendar.incrementDate(last, 1);
        }
      } catch (e: any) {
        return error(`Invalid date. ${e?.message ?? ''}`.trim());
      }

      // Determine season and daylight cap
      const season = ctx.calendar.seasonFor(calendarDate!);
      const daylightCap = CALENDAR_CONFIG.daylightCaps[season];

      appendEvent(ctx.file!, 'day_start', {
        calendarDate,
        season,
        daylightCap,
      });

      return info(
        `📅 Day started: ${ctx.calendar.formatDate(calendarDate!)} (daylight cap ${daylightCap}h)`,
      );
    }

    if (sub === 'end') {
      if (!open) {
        return warn('No open day. Use `day start [date]` first.');
      }

      // Summarize since last day_start — use integer segments internally
      let activeSegments = 0;
      let daylightSegments = 0;
      let nightSegments = 0;

      for (let i = events.length - 1; i >= 0; i--) {
        const e = events[i];
        if (e.kind === 'day_start') {
          break;
        }
        if (e.kind === 'time_log') {
          const segments = Number((e as any).payload?.segments ?? 0);
          const phase = String((e as any).payload?.phase ?? '');
          activeSegments += segments;
          if (phase === 'daylight') {
            daylightSegments += segments;
          } else if (phase === 'night') {
            nightSegments += segments;
          }
        }
      }

      // Convert to hours for stored summary and display
      const activeH = segmentsToHours(activeSegments);
      const daylightH = segmentsToHours(daylightSegments);
      const nightH = segmentsToHours(nightSegments);

      appendEvent(ctx.file!, 'day_end', {
        // Checked by `requireFile`
        summary: { active: activeH, daylight: daylightH, night: nightH },
      });

      let msg = `🌙 Day ended (active ${activeH.toFixed(1)}h: daylight ${daylightH.toFixed(1)}h, night ${nightH.toFixed(1)}h)`;
      if (activeH > 12) {
        msg += ` ⚠️ Exceeded 12h exhaustion threshold`;
      }
      return info(msg);
    }
  };
}

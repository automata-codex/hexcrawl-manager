import { info, warn, usage, error } from '@achm/cli-kit';
import { CALENDAR_CONFIG, segmentsToHours } from '@achm/core';

import { readEvents, appendEvent } from '../../../services/event-log.service';
import {
  findOpenDay,
  lastCalendarDate,
} from '../../../services/projectors.service';
import { requireFile, requireSession } from '../services/general';

import type { Context } from '../types';
import type { CampaignDate, Season } from '@achm/schemas';

/** Map seasons to emojis */
function getSeasonEmoji(season: Season): string {
  const emojis: Record<string, string> = {
    winter: '❄️',
    spring: '🌸',
    summer: '☀️',
    autumn: '🍂',
  };
  return emojis[season] || '🌍';
}

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
      let calendarDate: CampaignDate | null = null;

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
      const daylightCapHours = CALENDAR_CONFIG.daylightCaps[season];
      const daylightCapSegments = daylightCapHours * 2;

      // Check for season change
      const lastDate = lastCalendarDate(events);
      let seasonChangeMsg: string | null = null;
      if (lastDate) {
        const previousSeason = ctx.calendar.seasonFor(lastDate);
        if (previousSeason !== season) {
          const emoji = getSeasonEmoji(season);
          seasonChangeMsg = `${emoji} Season changed from ${previousSeason} to ${season}`;
        }
      }

      appendEvent(ctx.file!, 'day_start', {
        calendarDate,
        season,
        daylightCapSegments,
      });

      // Display season change message first, if applicable
      if (seasonChangeMsg) {
        info(seasonChangeMsg);
      }

      return info(
        `📅 Day started: ${ctx.calendar.formatDate(calendarDate!)} (daylight cap ${daylightCapHours}h)`,
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

      // Store segments in the event
      appendEvent(ctx.file!, 'day_end', {
        // Checked by `requireFile`
        summary: {
          activeSegments,
          daylightSegments,
          nightSegments,
        },
      });

      // Convert to hours for display
      const activeH = segmentsToHours(activeSegments);
      const daylightH = segmentsToHours(daylightSegments);
      const nightH = segmentsToHours(nightSegments);

      let msg = `🌙 Day ended (active ${activeH.toFixed(1)}h: daylight ${daylightH.toFixed(1)}h, night ${nightH.toFixed(1)}h)`;
      if (activeH > 12) {
        msg += ` ⚠️ Exceeded 12h exhaustion threshold`;
      }
      return info(msg);
    }
  };
}

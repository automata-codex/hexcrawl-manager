import { info, usage, warn } from '@skyreach/cli-kit';
import { hoursToSegmentsCeil, segmentsToHours } from '@skyreach/core';
import { EXHAUSTION_HOURS, STEP_HOURS } from '@skyreach/schemas';

import {
  activeSegmentsSinceStart,
  daylightSegmentsSinceStart,
  findOpenDay,
} from '../projectors.ts';
import { appendEvent, readEvents } from '../services/event-log';
import { requireFile } from '../services/general.ts';

import type { Context } from '../types';

export default function time(ctx: Context) {
  return (args: string[]) => {
    if (!requireFile(ctx)) {
      return;
    }

    if (args.length === 0) {
      return usage('Usage: time <hours>');
    }

    // Parse <hours> and <note> per spec
    const input = Number(args[0]);
    const note = (args[1] ?? '').trim();

    if (!Number.isFinite(input) || input <= 0) {
      return usage('usage: time <hours>');
    }

    const events = readEvents(ctx.file!); // Checked by `requireFile`
    const { open, lastStartIdx } = findOpenDay(events);
    if (!open) {
      return warn('❌ No open day. Start one with: day start [date]');
    }

    // Round up to nearest step, keep segments internally
    const segments = hoursToSegmentsCeil(input);
    const roundedHours = segmentsToHours(segments);
    if (roundedHours !== input) {
      warn(`⚠️ Rounded ${input}h → ${roundedHours}h (${STEP_HOURS}h steps).`);
    }

    // Pull daylight cap (in hours) off today's day_start
    const dayStart = events[lastStartIdx];
    const capHours = Number((dayStart as any).payload?.daylightCap ?? 9);
    const capSegments = Math.round(capHours / STEP_HOURS); // caps are multiples of 1.5h
    const usedSegments = daylightSegmentsSinceStart(events, lastStartIdx);

    // Split newly logged time between daylight and night
    let daylightSegments = 0;
    let nightSegments = 0;
    if (usedSegments < capSegments) {
      const remaining = capSegments - usedSegments;
      daylightSegments = Math.min(segments, remaining);
      nightSegments = segments - daylightSegments;
    } else {
      nightSegments = segments;
    }

    const phase =
      nightSegments > 0 && daylightSegments === 0 ? 'night' : 'daylight';
    // Build event payload per spec -- Store segments + phase only (integers internally)
    const eventPayload: any = {
      segments: segments,
      daylightSegments,
      nightSegments,
      phase,
      note: note.length > 0 ? note : undefined,
    };
    appendEvent(ctx.file!, 'time_log', eventPayload); // Checked by `requireFile`

    // User-facing output in hours
    const daylightH = segmentsToHours(daylightSegments);
    const nightH = segmentsToHours(nightSegments);

    // Exhaustion check (EXHAUSTION_HOURS total active per day)
    const EXHAUSTION_SEGMENTS = Math.round(EXHAUSTION_HOURS / STEP_HOURS);
    const activeBefore = activeSegmentsSinceStart(events, lastStartIdx);
    const activeAfter = activeBefore + segments;
    const totalAfterH = segmentsToHours(activeAfter);

    let msg: string;
    if (phase === 'daylight' && nightSegments === 0) {
      msg = `⏱️ Logged: ${roundedHours}h — daylight`;
    } else if (daylightSegments > 0 && nightSegments > 0) {
      msg = `⏱️ Logged: ${roundedHours}h — ${daylightH}h daylight, ${nightH}h 🌙 night`;
    } else {
      msg = `⏱️ Logged: ${roundedHours}h — 🌙 night`;
    }
    if (activeAfter > EXHAUSTION_SEGMENTS) {
      msg += ` ⚠️ Exceeded ${EXHAUSTION_HOURS}h exhaustion threshold (${totalAfterH.toFixed(1)}h total)`;
    }
    return info(msg);
  };
}

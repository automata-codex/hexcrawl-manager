import { STEP_HOURS } from '../constants.ts';
import { requireFile } from '../lib/guards.ts';
import { info, usage, warn } from '../lib/report';
import { appendEvent, readEvents } from '../services/event-log';
import type { Context, Event } from '../types';

function hoursToSegmentsCeil(hours: number) {
  return Math.ceil(hours / STEP_HOURS);
}

function segmentsToHours(segments: number) {
  return segments * STEP_HOURS;
}

// Sum ALL time segments (daylight + night) since the last day_start
function activeSegmentsSinceStart(events: Event[], startIdx: number) {
  let segments = 0;
  for (let i = startIdx + 1; i < events.length; i++) {
    const e = events[i];
    if (e.kind === 'time_log') {
      segments += Number((e as any).payload?.segments ?? 0);
    }
  }
  return segments;
}

function findOpenDay(events: Event[]) {
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
  const open = lastStartIdx !== -1 && (lastEndIdx === -1 || lastStartIdx > lastEndIdx);
  return { open, lastStartIdx };
}

function daylightSegmentsSinceStart(events: Event[], startIdx: number) {
  let segments = 0;
  for (let i = startIdx + 1; i < events.length; i++) {
    const e = events[i];
    if (e.kind === 'time_log' && (e as any).payload?.phase === 'daylight') {
      segments += Number((e as any).payload?.segments ?? 0);
    }
  }
  return segments;
}

export default function time(ctx: Context) {
  return (args: string[]) => {
    if (!requireFile(ctx)) {
      return;
    }

    if (args.length === 0) {
      return usage('Usage: time <hours>');
    }

    const input = Number(args[0]);
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
      warn(`⚠️ Rounded ${input}h → ${roundedHours}h (1.5h steps).`);
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

    const phase = nightSegments > 0 && daylightSegments === 0 ? 'night' : 'daylight';
    // Store segments + phase only (integers internally)
    appendEvent(ctx.file!, 'time_log', { segments: segments, phase }); // Checked by `requireFile`

    // User-facing output in hours
    const daylightH = segmentsToHours(daylightSegments);
    const nightH = segmentsToHours(nightSegments);

    // Exhaustion check (12h total active per day)
    const EXHAUSTION_HOURS = 12;
    const EXHAUSTION_SEGMENTS = Math.round(EXHAUSTION_HOURS / STEP_HOURS); // 12 / 1.5 = 8
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
      msg += ` ⚠️ Exceeded 12h exhaustion threshold (${totalAfterH.toFixed(1)}h total)`;
    }
    return info(msg);
  };
}

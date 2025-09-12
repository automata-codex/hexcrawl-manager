import { requireFile } from '../lib/guards.ts';
import { info, usage, warn } from '../lib/report';
import { appendEvent, readEvents } from '../services/event-log';
import type { Context, Event } from '../types';

// 1 segment = 1.5 hours (integer math internally)
const STEP_HOURS = 1.5;

function hoursToSegmentsCeil(hours: number) {
  return Math.ceil(hours / STEP_HOURS);
}

function segmentsToHours(segments: number) {
  return segments * STEP_HOURS;
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
  return {open, lastStartIdx};
}

function daylightSegmentsSinceStart(events: Event[], startIdx: number) {
  let segs = 0;
  for (let i = startIdx + 1; i < events.length; i++) {
    const e = events[i];
    if (e.kind === 'time_log' && (e as any).payload?.phase === 'daylight') {
      segs += Number((e as any).payload?.segments ?? 0);
    }
  }
  return segs;
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
    const {open, lastStartIdx} = findOpenDay(events);
    if (!open) {
      return warn('❌ No open day. Start one with: day start [date]');
    }

    // Round up to nearest step, keep segments internally
    const segs = hoursToSegmentsCeil(input);
    const roundedHours = segmentsToHours(segs);
    if (roundedHours !== input) {
      warn(`⚠️ Rounded ${input}h → ${roundedHours}h (1.5h steps).`);
    }

    // Pull daylight cap (in hours) off today's day_start
    const dayStart = events[lastStartIdx];
    const capHours = Number((dayStart as any).payload?.daylightCap ?? 9);
    const capSegs = Math.round(capHours / STEP_HOURS); // caps are multiples of 1.5h
    const usedSegs = daylightSegmentsSinceStart(events, lastStartIdx);

    // Split newly logged time between daylight and night
    let daylightSegs = 0;
    let nightSegs = 0;
    if (usedSegs < capSegs) {
      const remaining = capSegs - usedSegs;
      daylightSegs = Math.min(segs, remaining);
      nightSegs = segs - daylightSegs;
    } else {
      nightSegs = segs;
    }

    const phase = nightSegs > 0 && daylightSegs === 0 ? 'night' : 'daylight';
    // Store segments + phase only (integers internally)
    appendEvent(ctx.file!, 'time_log', {segments: segs, phase}); // Checked by `requireFile`

    // User-facing output in hours
    const daylightH = segmentsToHours(daylightSegs);
    const nightH = segmentsToHours(nightSegs);
    if (phase === 'daylight' && nightSegs === 0) {
      return info(`⏱️ Logged: ${roundedHours}h — daylight`);
    }
    if (daylightSegs > 0 && nightSegs > 0) {
      return info(`⏱️ Logged: ${roundedHours}h — ${daylightH}h daylight, ${nightH}h 🌙 night`);
    }
    return info(`⏱️ Logged: ${roundedHours}h — 🌙 night`);
  };
}

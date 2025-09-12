import type { CanonicalDate, Event } from '../types.ts';
import { STEP_HOURS } from '../constants.ts';

// Sum ALL time segments (daylight + night) since the last day_start
export function activeSegmentsSinceStart(events: Event[], startIdx: number) {
  let segments = 0;
  for (let i = startIdx + 1; i < events.length; i++) {
    const e = events[i];
    if (e.kind === 'time_log') {
      segments += Number((e as any).payload?.segments ?? 0);
    }
  }
  return segments;
}

export function daylightSegmentsSinceStart(events: Event[], startIdx: number) {
  let segments = 0;
  for (let i = startIdx + 1; i < events.length; i++) {
    const e = events[i];
    if (e.kind === 'time_log' && (e as any).payload?.phase === 'daylight') {
      segments += Number((e as any).payload?.segments ?? 0);
    }
  }
  return segments;
}

export function findOpenDay(events: Event[]) {
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

export function hoursToSegmentsCeil(hours: number) {
  return Math.ceil(hours / STEP_HOURS);
}

export function lastCalendarDate(events: Event[]): CanonicalDate | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.kind === 'day_start' && (e as any).payload?.calendarDate) {
      return (e as any).payload.calendarDate as CanonicalDate;
    }
    if (e.kind === 'date_set' && (e as any).payload?.calendarDate) {
      return (e as any).payload.calendarDate as CanonicalDate;
    }
  }
  return null;
}

export function segmentsToHours(segments: number) {
  return segments * STEP_HOURS;
}


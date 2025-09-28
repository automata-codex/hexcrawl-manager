/*
 PROJECTORS: Derive current state from the event log (date, hex, party, weather, etc.)
 */

import { normalizeHexId } from '@skyreach/core';

import { datesEqual } from './lib/date.ts';

import type { CanonicalDate, WeatherCommitted } from './types';
import type { Event } from '@skyreach/cli-kit';

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
  const open =
    lastStartIdx !== -1 && (lastEndIdx === -1 || lastStartIdx > lastEndIdx);
  return { open, lastStartIdx };
}

export function firstCalendarDate(events: Event[]): CanonicalDate | null {
  for (let i = 0; i < events.length; i++) {
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

export function isDayOpen(events: Event[]) {
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
  return (
    lastStartIdx !== -1 && (lastEndIdx === -1 || lastStartIdx > lastEndIdx)
  );
}

export function isPartyLost(events: Event[]): boolean {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.kind === 'lost' && e.payload && typeof e.payload === 'object') {
      const state = (e.payload as any).state;
      if (state === 'on') return true;
      if (state === 'off') return false;
    }
    if (e.kind === 'session_start') {
      return false;
    }
  }
  return false;
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

/** Returns the current hex derived from the event log. */
export function selectCurrentHex(events: Event[]): string | null {
  // Prefer the last move's destination
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.kind === 'move' && e.payload && typeof e.payload === 'object') {
      const to = (e.payload as any).to;
      if (typeof to === 'string') {
        return normalizeHexId(to);
      }
    }
  }
  // Fallback: starting hex (session_start)
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (
      e.kind === 'session_start' &&
      e.payload &&
      typeof e.payload === 'object'
    ) {
      const hx = (e.payload as any).startHex;
      if (typeof hx === 'string') {
        return normalizeHexId(hx);
      }
    }
  }
  return null;
}

/** Returns the latest party list derived from the event log. */
export function selectParty(events: Event[]): string[] {
  let latest: string[] | null = null;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.kind === 'party_set' && e.payload && typeof e.payload === 'object') {
      const ids = (e.payload as any).ids;
      if (Array.isArray(ids) && ids.every((x) => typeof x === 'string')) {
        latest = [...ids];
      }
    }
  }
  return latest ?? [];
}

/** Returns the most recent WeatherCommitted payload from the event log, or null if none. */
export function selectCurrentWeather(events: Event[]): WeatherCommitted | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.kind === 'weather_committed' && e.payload) {
      return e.payload as WeatherCommitted;
    }
  }
  return null;
}

/** Returns the most recent forecastAfter value from a previous day's weather_committed event, or 0 if none. */
export function selectCurrentForecast(events: Event[]): number {
  const today = lastCalendarDate(events);
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (
      e.kind === 'weather_committed' &&
      e.payload &&
      typeof e.payload === 'object'
    ) {
      const eventDate = (e.payload as WeatherCommitted).date;
      if (datesEqual(today, eventDate)) {
        continue; // skip today's weather
      }
      const forecast = (e.payload as WeatherCommitted).forecastAfter;
      if (typeof forecast === 'number') {
        return forecast;
      }
    }
  }
  return 0;
}

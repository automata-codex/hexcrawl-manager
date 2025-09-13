import { normalizeHex } from './lib/hex.ts';
import type { Event } from './types';

/** Returns the current hex derived from the event log. */
export function selectCurrentHex(events: Event[]): string | null {
  // Prefer the last move's destination
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.kind === 'move' && e.payload && typeof e.payload === 'object') {
      const to = (e.payload as any).to;
      if (typeof to === 'string') {
        return normalizeHex(to);
      }
    }
  }
  // Fallback: starting hex (session_start)
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.kind === 'session_start' && e.payload && typeof e.payload === 'object') {
      const hx = (e.payload as any).startHex;
      if (typeof hx === 'string') {
        return normalizeHex(hx);
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
      if (Array.isArray(ids) && ids.every(x => typeof x === 'string')) {
        latest = [...ids];
      }
    }
  }
  return latest ?? [];
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

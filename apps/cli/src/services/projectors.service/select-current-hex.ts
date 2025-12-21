/** Returns the current hex derived from the event log. */
import { normalizeHexId } from '@achm/core';

import type { ScribeEvent } from '@achm/schemas';

export function selectCurrentHex(events: ScribeEvent[]): string | null {
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

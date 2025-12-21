import type { ScribeEvent } from '@achm/schemas';

export function isPartyLost(events: ScribeEvent[]): boolean {
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

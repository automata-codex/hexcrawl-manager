/** Returns the latest party list derived from the event log. */
import type { ScribeEvent } from '@skyreach/schemas';

export function selectParty(events: ScribeEvent[]): string[] {
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

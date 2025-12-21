/** Returns the latest party list derived from the event log. */
import type { PartyMember, ScribeEvent } from '@achm/schemas';

export function selectParty(events: ScribeEvent[]): PartyMember[] {
  let latest: PartyMember[] | null = null;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.kind === 'party_set' && e.payload) {
      // The schema validates that ids is PartyMember[]
      latest = [...e.payload.ids];
    }
  }
  return latest ?? [];
}

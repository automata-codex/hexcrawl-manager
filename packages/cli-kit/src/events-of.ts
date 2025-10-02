import type { Event } from '@skyreach/schemas';

export function eventsOf(events: Event[], kind: string): Event[] {
  return events.filter((e) => e.kind === kind);
}

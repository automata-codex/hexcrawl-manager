import type { Event } from './types';

export function eventsOf(events: Event[], kind: string): Event[] {
  return events.filter((e) => e.kind === kind);
}

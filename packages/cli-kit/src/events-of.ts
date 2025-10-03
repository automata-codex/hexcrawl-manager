import type { ScribeEvent } from '@skyreach/schemas';

export function eventsOf(events: ScribeEvent[], kind: string): ScribeEvent[] {
  return events.filter((e) => e.kind === kind);
}

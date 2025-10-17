import type { ScribeEvent } from '@skyreach/schemas';

// Sum ALL time segments (daylight + night) since the last day_start
export function activeSegmentsSinceStart(
  events: ScribeEvent[],
  startIdx: number,
) {
  let segments = 0;
  for (let i = startIdx + 1; i < events.length; i++) {
    const e = events[i];
    if (e.kind === 'time_log') {
      segments += Number((e as any).payload?.segments ?? 0);
    }
  }
  return segments;
}

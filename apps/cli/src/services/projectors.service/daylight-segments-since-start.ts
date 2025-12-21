import type { ScribeEvent } from '@achm/schemas';

export function daylightSegmentsSinceStart(
  events: ScribeEvent[],
  startIdx: number,
) {
  let segments = 0;
  for (let i = startIdx + 1; i < events.length; i++) {
    const e = events[i];
    if (e.kind === 'time_log' && (e as any).payload?.phase === 'daylight') {
      segments += Number((e as any).payload?.segments ?? 0);
    }
  }
  return segments;
}

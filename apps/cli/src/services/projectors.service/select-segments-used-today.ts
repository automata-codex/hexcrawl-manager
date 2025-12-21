import { warn } from '@achm/cli-kit';
import { ScribeEvent } from '@achm/schemas';

import { activeSegmentsSinceStart } from './active-segments-since-start';
import { daylightSegmentsSinceStart } from './daylight-segments-since-start';
import { findOpenDay } from './find-open-day';

export function selectSegmentsUsedToday(
  events: ScribeEvent[],
): { daylightSegments: number; activeSegments: number } | null {
  const { open, lastStartIdx } = findOpenDay(events);
  if (!open) {
    warn('No open day found in events.');
    return null;
  }

  const daylightSegments = daylightSegmentsSinceStart(events, lastStartIdx);
  const activeSegments = activeSegmentsSinceStart(events, lastStartIdx);
  return { daylightSegments, activeSegments };
}

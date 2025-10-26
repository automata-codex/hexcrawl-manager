import { segmentsToHours } from '@skyreach/core';

import { appendEvent } from '../../../../services/event-log.service';

/**
 * Emit a day_end event with time summary.
 * Converts segments to hours for the event payload.
 * @returns The sequence number of the emitted event
 */
export function emitDayEnd(
  file: string,
  activeSegments: number,
  daylightSegments: number,
  nightSegments: number,
): number {
  const event = appendEvent(file, 'day_end', {
    summary: {
      active: segmentsToHours(activeSegments),
      daylight: segmentsToHours(daylightSegments),
      night: segmentsToHours(nightSegments),
    },
  });
  return event.seq;
}

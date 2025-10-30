import { appendEvent } from '../../../../services/event-log.service';

/**
 * Emit a day_end event with time summary.
 * Stores time values in segments (30-minute increments).
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
      activeSegments,
      daylightSegments,
      nightSegments,
    },
  });
  return event.seq;
}

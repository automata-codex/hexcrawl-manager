import { appendEvent } from '../../../../services/event-log.service';

/**
 * Emit a time_log event.
 * @returns The sequence number of the emitted event
 */
export function emitTimeLog(
  file: string,
  totalSegments: number,
  daylightSegments: number,
  nightSegments: number,
  phase: 'daylight' | 'night',
): number {
  const event = appendEvent(file, 'time_log', {
    segments: totalSegments,
    daylightSegments,
    nightSegments,
    phase,
  });
  return event.seq;
}

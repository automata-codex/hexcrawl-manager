import { segmentsToHours } from '@skyreach/core';

import { appendEvent } from '../../../../services/event-log.service';

import type { CampaignDate, Pace } from '@skyreach/schemas';

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

/**
 * Emit a day_start event.
 * @returns The sequence number of the emitted event
 */
export function emitDayStart(
  file: string,
  date: CampaignDate,
  season: string,
  daylightCapHours: number,
): number {
  const event = appendEvent(file, 'day_start', {
    calendarDate: date,
    season,
    daylightCap: daylightCapHours,
  });
  return event.seq;
}

/**
 * Emit a weather_committed event.
 * Note: The actual weather payload would need to be generated
 * by rolling weather. For now, this is a placeholder.
 * @returns An object with the sequence number and payload
 */
export function emitWeatherCommitted(
  file: string,
  payload: any,
): { seq: number; payload: any } {
  const event = appendEvent(file, 'weather_committed', payload);
  return { seq: event.seq, payload };
}

/**
 * Emit a move event.
 * @returns The sequence number of the emitted event
 */
export function emitMove(
  file: string,
  from: string | null,
  to: string,
  pace: Pace,
): number {
  const event = appendEvent(file, 'move', { from, to, pace });
  return event.seq;
}

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

/**
 * Emit a note event.
 * @returns The sequence number of the emitted event
 */
export function emitNote(
  file: string,
  text: string,
  scope: 'day' | 'session' = 'session',
): number {
  const event = appendEvent(file, 'note', { text, scope });
  return event.seq;
}

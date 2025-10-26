import { segmentsToHours } from '@skyreach/core';
import type { CampaignDate, Pace } from '@skyreach/schemas';

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
  return appendEvent(file, 'day_end', {
    summary: {
      active: segmentsToHours(activeSegments),
      daylight: segmentsToHours(daylightSegments),
      night: segmentsToHours(nightSegments),
    },
  });
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
  return appendEvent(file, 'day_start', {
    calendarDate: date,
    season,
    daylightCap: daylightCapHours,
  });
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
  const seq = appendEvent(file, 'weather_committed', payload);
  return { seq, payload };
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
  return appendEvent(file, 'move', { from, to, pace });
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
  return appendEvent(file, 'time_log', {
    segments: totalSegments,
    daylightSegments,
    nightSegments,
    phase,
  });
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
  return appendEvent(file, 'note', { text, scope });
}

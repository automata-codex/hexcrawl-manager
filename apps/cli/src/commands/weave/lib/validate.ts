import { getSeasonForDate } from '@skyreach/core';

import { eventsOf } from '../../../services/event-log.service';

import type { DayStartEvent, ScribeEvent } from '@skyreach/schemas';

/**
 * Session envelope validation helper for weave commands. Usage: `const result = validateSessionEnvelope(events);`
 * @returns { isValid: boolean, error: string | null }
 */
export function validateSessionEnvelope(
  events: ScribeEvent[],
  stemDate: string,
): {
  isValid: boolean;
  error: string | null;
} {
  if (!Array.isArray(events) || events.length === 0) {
    return { isValid: false, error: 'No events found.' };
  }
  const first = events[0]?.kind;
  const last = events[events.length - 1]?.kind;
  if (first !== 'session_start' && first !== 'session_continue') {
    return {
      isValid: false,
      error: 'Session must start with session_start or session_continue.',
    };
  }
  if (last !== 'session_end' && last !== 'session_pause') {
    return {
      isValid: false,
      error: 'Session must end with session_end or session_pause.',
    };
  }
  const dayStarts = eventsOf(events, 'day_start') as DayStartEvent[];
  if (dayStarts.length === 0) {
    return {
      isValid: false,
      error: 'Session must contain at least one day_start event.',
    };
  }
  const seasonIds = new Set(
    dayStarts.map((e) => getSeasonForDate(e.payload.calendarDate)),
  );
  if (seasonIds.size > 1) {
    return {
      isValid: false,
      error: 'All day_start events must have the same seasonId.',
    };
  }
  // Check session_start.sessionDate matches stemDate if provided
  if (stemDate) {
    const sessionStartEvent = events.find((e) => e.kind === 'session_start');
    if (
      sessionStartEvent &&
      sessionStartEvent.payload?.sessionDate !== stemDate
    ) {
      return {
        isValid: false,
        error: `session_start.sessionDate (${sessionStartEvent.payload?.sessionDate}) does not match stem date (${stemDate}).`,
      };
    }
  }
  return { isValid: true, error: null };
}

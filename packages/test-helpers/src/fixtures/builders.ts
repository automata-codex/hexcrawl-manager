import { getDaylightCapForSeason, getSeasonForDate } from '@skyreach/core';
import {
  type ScribeEventKind,
  type PayloadOfKind,
  type DayStartEventPayload,
  type SessionContinueEventPayload,
} from '@skyreach/schemas';

/** Discriminated prototype that a finalizer can stamp with seq/ts. */
export type EventPrototype<K extends ScribeEventKind> = {
  kind: K;
  payload: PayloadOfKind<K>;
};

/** Convenience alias for arrays of mixed prototypes. */
export type AnyEventPrototype = EventPrototype<ScribeEventKind>;

/* -------------------------------------------------------------
 * Builder functions (alphabetical)
 * -------------------------------------------------------------*/

export function dayEnd(
  active: number,
  daylight: number,
): EventPrototype<'day_end'> {
  const night = Math.max(active - daylight, 0);
  return {
    kind: 'day_end',
    payload: { summary: { active, daylight, night } },
  };
}

export function dayStart(
  calendarDate: DayStartEventPayload['calendarDate'],
): EventPrototype<'day_start'> {
  const season = getSeasonForDate(calendarDate);
  return {
    kind: 'day_start',
    payload: {
      calendarDate,
      season,
      daylightCap: getDaylightCapForSeason(season),
    },
  };
}

export function deadReckoning(
  outcome: 'success' | 'failure',
): EventPrototype<'dead_reckoning'> {
  return {
    kind: 'dead_reckoning',
    payload: { outcome },
  };
}

export function lost(
  state: 'on' | 'off',
  reason?: string,
): EventPrototype<'lost'> {
  return {
    kind: 'lost',
    payload: { state, reason },
  };
}

export function move(
  from: string,
  to: string,
  pace: 'slow' | 'normal' | 'fast' = 'normal',
): EventPrototype<'move'> {
  return {
    kind: 'move',
    payload: { from, to, pace },
  };
}

export function note(text: string): EventPrototype<'note'> {
  return {
    kind: 'note',
    payload: { text, scope: 'session' },
  };
}

export function partySet(ids: string[]): EventPrototype<'party_set'> {
  return {
    kind: 'party_set',
    payload: { ids },
  };
}

export function seasonRollover(
  seasonId: string,
): EventPrototype<'season_rollover'> {
  return {
    kind: 'season_rollover',
    payload: { seasonId },
  };
}

export function sessionContinue(
  sessionId: string,
  currentHex: string,
  currentParty: string[],
  currentDate?: SessionContinueEventPayload['currentDate'],
): EventPrototype<'session_continue'> {
  return {
    kind: 'session_continue',
    payload: {
      id: sessionId,
      currentDate,
      currentHex,
      currentParty,
      status: 'in-progress',
    },
  };
}

export function sessionEnd(sessionId: string): EventPrototype<'session_end'> {
  return {
    kind: 'session_end',
    payload: {
      id: sessionId,
      status: 'final',
    },
  };
}

export function sessionPause(
  sessionId: string,
): EventPrototype<'session_pause'> {
  return {
    kind: 'session_pause',
    payload: {
      id: sessionId,
      status: 'paused',
    },
  };
}

export function sessionStart(
  sessionId: string,
  startHex: string,
): EventPrototype<'session_start'> {
  return {
    kind: 'session_start',
    payload: { id: sessionId, startHex, status: 'in-progress' },
  };
}

export function timeLog(
  segments: number,
  daylightSegments: number,
  nightSegments: number,
  phase: 'daylight' | 'night',
  note?: string,
): EventPrototype<'time_log'> {
  return {
    kind: 'time_log',
    payload: {
      segments,
      daylightSegments,
      nightSegments,
      phase,
      note,
    },
  };
}

export function trail(
  from: string,
  to: string,
): EventPrototype<'trail'> {
  return {
    kind: 'trail',
    payload: { from, to, marked: true },
  };
}

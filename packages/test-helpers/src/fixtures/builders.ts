import { getDaylightCapForSeason, getSeasonForDate } from '@skyreach/core';
import {
  type DateSetEventPayload,
  type DayStartEventPayload,
  type PayloadOfKind,
  type Pace,
  type Pillar,
  type ScribeEventKind,
  type Season,
  type SessionContinueEventPayload,
  type WeatherCategory,
} from '@skyreach/schemas';

/** Discriminated prototype that a finalizer can stamp with seq/ts. */
export type EventPrototype<K extends ScribeEventKind> = {
  kind: K;
  payload: PayloadOfKind<K>;
};

/** Convenience alias for arrays of mixed prototypes. */
export type AnyEventPrototype = EventPrototype<ScribeEventKind>;

const DEFAULT_DATE = '2025-10-01';

/* -------------------------------------------------------------
 * Builder functions (alphabetical)
 * -------------------------------------------------------------*/

export function ap(
  pillar: Pillar,
  tier: number,
  party?: string[],
  hex?: string,
  note?: string,
): EventPrototype<'advancement_point'> {
  return {
    kind: 'advancement_point',
    payload: {
      pillar,
      tier,
      note,
      at: {
        hex: hex ?? null,
        party: party ?? [],
      },
    },
  };
}

export function backtrack(pace: Pace): EventPrototype<'backtrack'> {
  return {
    kind: 'backtrack',
    payload: { pace },
  };
}

export function dateSet(
  calendarDate: DateSetEventPayload['calendarDate'],
): EventPrototype<'date_set'> {
  return {
    kind: 'date_set',
    payload: { calendarDate },
  };
}

export function dayEnd(
  activeSegments: number,
  daylightSegments: number,
): EventPrototype<'day_end'> {
  const nightSegments = Math.max(activeSegments - daylightSegments, 0);
  return {
    kind: 'day_end',
    payload: { summary: { activeSegments, daylightSegments, nightSegments } },
  };
}

export function dayStart(
  calendarDate: DayStartEventPayload['calendarDate'],
): EventPrototype<'day_start'> {
  const season = getSeasonForDate(calendarDate);
  const daylightCapHours = getDaylightCapForSeason(season);
  return {
    kind: 'day_start',
    payload: {
      calendarDate,
      season,
      daylightCapSegments: daylightCapHours * 2,
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
  pace: Pace = 'normal',
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

export function partySet(
  ids: import('@skyreach/schemas').PartyMember[],
): EventPrototype<'party_set'> {
  return {
    kind: 'party_set',
    payload: { ids },
  };
}

export function guest(
  playerName: string,
  characterName: string,
): { playerName: string; characterName: string } {
  return { playerName, characterName };
}

export function scout(
  from: string,
  target: string,
  revealLandmark: boolean,
): EventPrototype<'scout'> {
  return {
    kind: 'scout',
    payload: {
      from,
      target,
      reveal: {
        terrain: true,
        vegetation: true,
        landmark: revealLandmark,
      },
    },
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
  sessionDate: string = DEFAULT_DATE,
): EventPrototype<'session_continue'> {
  return {
    kind: 'session_continue',
    payload: {
      id: sessionId,
      currentDate,
      currentHex,
      currentParty,
      status: 'in-progress',
      sessionDate,
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
  sessionDate: string = DEFAULT_DATE,
): EventPrototype<'session_start'> {
  return {
    kind: 'session_start',
    payload: {
      id: sessionId,
      sessionDate,
      startHex,
      status: 'in-progress',
    },
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

export function trail(from: string, to: string): EventPrototype<'trail'> {
  return {
    kind: 'trail',
    payload: { from, to, marked: true },
  };
}

export function weather(args: {
  category: WeatherCategory;
  date: DayStartEventPayload['calendarDate'];
  descriptors?: string[];
  detail?: string | null;
  forecastAfter: number;
  forecastBefore: number;
  roll2d6: number;
  season: Season;
}): EventPrototype<'weather_committed'> {
  return {
    kind: 'weather_committed',
    payload: {
      ...args,
      total: args.roll2d6 + args.forecastBefore,
    },
  };
}

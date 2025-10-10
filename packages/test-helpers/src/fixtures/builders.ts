import {
  CampaignDate,
  DayEndEventPayload,
  DayStartEventPayload,
  DeadReckoningEventPayload,
  LostEventPayload,
  MoveEventPayload,
  NoteEventPayload,
  PartySetEventPayload,
  SeasonRolloverEventPayload,
  SessionContinueEventPayload,
  SessionEndEventPayload,
  SessionPauseEventPayload,
  SessionStartEventPayload,
  TimeLogEventPayload,
  TrailEventPayload,
} from '@skyreach/schemas';

export function dayEnd(
  active: number,
  daylight: number,
  night: number,
): DayEndEventPayload {
  return {
    summary: { active, daylight, night },
  };
}

export function dayStart(
  calendarDate: CampaignDate,
  season: string,
  daylightCap: number,
): DayStartEventPayload {
  return {
    calendarDate,
    season,
    daylightCap,
  };
}

export function deadReckoning(
  outcome: 'success' | 'failure',
): DeadReckoningEventPayload {
  return { outcome };
}

export function lost(state: 'on' | 'off', reason?: string): LostEventPayload {
  return { state, reason };
}

export function move(
  from: string,
  to: string,
  pace: 'slow' | 'normal' | 'fast' = 'normal',
): MoveEventPayload {
  return { from, to, pace };
}

export function note(text: string): NoteEventPayload {
  return { text, scope: 'session' };
}

export function partySet(ids: string[]): PartySetEventPayload {
  return { ids };
}

export function seasonRollover(seasonId: string): SeasonRolloverEventPayload {
  return { seasonId };
}

export function sessionContinue(
  sessionId: string,
  currentHex: string,
  currentParty: string[],
  currentDate?: SessionContinueEventPayload['currentDate'],
): SessionContinueEventPayload {
  return {
    id: sessionId,
    currentDate,
    currentHex,
    currentParty,
    status: 'in-progress',
  };
}

export function sessionEnd(sessionId: string): SessionEndEventPayload {
  return {
    id: sessionId,
    status: 'final',
  };
}

export function sessionPause(sessionId: string): SessionPauseEventPayload {
  return {
    id: sessionId,
    status: 'paused',
  };
}

export function sessionStart(
  sessionId: string,
  startHex: string,
): SessionStartEventPayload {
  return {
    id: sessionId,
    startHex,
    status: 'in-progress',
  };
}

export function timeLog(
  segments: number,
  daylightSegments: number,
  nightSegments: number,
  phase: 'daylight' | 'night',
  note?: string,
): TimeLogEventPayload {
  return {
    segments,
    daylightSegments,
    nightSegments,
    phase,
    note,
  };
}

export function trail(from: string, to: string): TrailEventPayload {
  return { from, to, marked: true };
}

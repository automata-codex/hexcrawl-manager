import { makeEncounterNote, rollEncounterOccurs } from '../encounters';
import { hasAlerts, makeHexAlertNote, type HexAlerts } from '../hex-alerts';

import { executeLeg } from './execute-leg';

import type { WeatherCommitted } from '@achm/core';
import type {
  CampaignDate,
  DayEndEventPayload,
  DayStartEventPayload,
  MoveEventPayload,
  NoteEventPayload,
  Pace,
  Season,
  TimeLogEventPayload,
  WeatherCommittedEventPayload,
} from '@achm/schemas';

/**
 * Events that can occur during fast travel execution.
 * Uses payload types from scribe-event schemas for type safety.
 */
export type FastTravelEvent =
  | { type: 'move'; payload: MoveEventPayload }
  | { type: 'time_log'; payload: TimeLogEventPayload }
  | { type: 'note'; payload: NoteEventPayload }
  | { type: 'day_end'; payload: DayEndEventPayload }
  | { type: 'day_start'; payload: DayStartEventPayload }
  | { type: 'weather_committed'; payload: WeatherCommittedEventPayload };

/**
 * Result of executing fast travel.
 */
export interface FastTravelResult {
  /** Status of the fast travel execution */
  status:
    | 'completed'
    | 'paused_encounter'
    // Entered a hex with unknown clues or pending GM updates.
    | 'paused_hex_alert'
    | 'paused_no_capacity'
    // Set by the journey orchestrator (not the per-day runner): a single leg
    // can't fit even a fresh full day's daylight, so we stop rather than loop.
    | 'error_no_progress';
  /** Current leg index in the route */
  currentLegIndex: number;
  /** Events to emit */
  events: FastTravelEvent[];
  /** Final segment counts for the current day */
  finalSegments: {
    active: number;
    daylight: number;
    night: number;
  };
}

/**
 * State for fast travel execution.
 */
export interface FastTravelState {
  /** Current hex (or null if starting fresh) */
  currentHex: string | null;
  /** Route to follow (array of hex IDs) */
  route: string[];
  /** Current index in route */
  currentLegIndex: number;
  /** Travel pace */
  pace: Pace;
  /** Active segments used today */
  activeSegmentsToday: number;
  /** Daylight segments used today */
  daylightSegmentsToday: number;
  /** Night segments used today */
  nightSegmentsToday: number;
  /** Daylight segments remaining today */
  daylightSegmentsLeft: number;
  /** Total daylight cap in segments */
  daylightCapSegments: number;
  /** Current weather */
  weather: WeatherCommitted | null;
  /** Current date */
  currentDate: CampaignDate;
  /** Current season */
  currentSeason: Season;
  /** d20 encounter-chance threshold per route hex (key = route entry) */
  encounterChances: Record<string, number>;
  /** Arrival alerts (unknown clues / GM updates) per route hex */
  hexAlerts: Record<string, HexAlerts>;
}

/**
 * Execute fast travel for one or more legs.
 *
 * This is a pure function that generates a sequence of events and a final status.
 * It does NOT perform I/O - the caller is responsible for emitting events.
 *
 * @param state Current fast travel state
 * @returns Result with status, events, and final state
 */
export function runFastTravel(state: FastTravelState): FastTravelResult {
  const events: FastTravelEvent[] = [];
  let {
    currentHex,
    currentLegIndex,
    activeSegmentsToday,
    daylightSegmentsToday,
    nightSegmentsToday,
    daylightSegmentsLeft,
  } = state;

  // Process legs until we complete, encounter something, or need to stop
  while (currentLegIndex < state.route.length) {
    const destHex = state.route[currentLegIndex];
    const fromHex = currentHex;

    // Try to execute the leg
    const legResult = executeLeg({
      destHex,
      pace: state.pace,
      activeSegmentsToday,
      daylightSegmentsLeft,
      weather: state.weather,
    });

    if (!legResult.canExecute) {
      if (legResult.reason === 'no_capacity') {
        // Out of capacity for today - pause
        // For MVP, we don't automatically advance days - pause instead
        return {
          status: 'paused_no_capacity',
          currentLegIndex,
          events,
          finalSegments: {
            active: activeSegmentsToday,
            daylight: daylightSegmentsToday,
            night: nightSegmentsToday,
          },
        };
      } else if (legResult.reason === 'new_day_needed') {
        // Need a new day - emit day_end, day_start, weather
        // For MVP, we don't automatically advance days - pause instead
        return {
          status: 'paused_no_capacity',
          currentLegIndex,
          events,
          finalSegments: {
            active: activeSegmentsToday,
            daylight: daylightSegmentsToday,
            night: nightSegmentsToday,
          },
        };
      }
    }

    // Leg fits! Emit move and time_log
    events.push({
      type: 'move',
      payload: {
        from: fromHex,
        to: destHex,
        pace: state.pace,
      },
    });

    events.push({
      type: 'time_log',
      payload: {
        segments: legResult.segmentsUsed,
        daylightSegments: legResult.daylightSegmentsUsed,
        nightSegments: legResult.nightSegmentsUsed,
        phase: 'daylight', // For MVP, all travel is during daylight
      },
    });

    // Update state
    activeSegmentsToday += legResult.segmentsUsed;
    daylightSegmentsToday += legResult.daylightSegmentsUsed;
    nightSegmentsToday += legResult.nightSegmentsUsed;
    daylightSegmentsLeft -= legResult.daylightSegmentsUsed;
    currentHex = destHex;
    currentLegIndex++;

    // Check the hex just entered for arrival alerts (unknown clues / GM
    // updates) and encounters. Both are checked AFTER the move so the party
    // pauses IN the flagged hex, and a later resume picks up at the next leg
    // without re-checking this hex. When both fire at once we pause once,
    // with the encounter status (the more actionable of the two) — both
    // notes still land in the log.
    const alerts = state.hexAlerts[destHex];
    const alerted = alerts !== undefined && hasAlerts(alerts);
    if (alerted) {
      events.push({
        type: 'note',
        payload: {
          text: makeHexAlertNote(destHex, alerts),
          scope: 'session',
        },
      });
    }

    const threshold = state.encounterChances[destHex] ?? 0;
    if (rollEncounterOccurs(threshold)) {
      // Encounter occurred - log a prompt for the GM to roll it, and pause
      events.push({
        type: 'note',
        payload: {
          text: makeEncounterNote(destHex, threshold),
          scope: 'session',
        },
      });

      return {
        status: 'paused_encounter',
        currentLegIndex,
        events,
        finalSegments: {
          active: activeSegmentsToday,
          daylight: daylightSegmentsToday,
          night: nightSegmentsToday,
        },
      };
    }

    // Alerts pause the journey only mid-route: at the destination the
    // journey is over anyway, so we complete instead (the alert note above
    // is still logged, and the completion handler displays the alerts).
    if (alerted && currentLegIndex < state.route.length) {
      return {
        status: 'paused_hex_alert',
        currentLegIndex,
        events,
        finalSegments: {
          active: activeSegmentsToday,
          daylight: daylightSegmentsToday,
          night: nightSegmentsToday,
        },
      };
    }
  }

  // Completed all legs
  return {
    status: 'completed',
    currentLegIndex,
    events,
    finalSegments: {
      active: activeSegmentsToday,
      daylight: daylightSegmentsToday,
      night: nightSegmentsToday,
    },
  };
}

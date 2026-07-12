import { makeEncounterNote, rollEncounterOccurs } from '../encounters';
import { hasAlerts, makeHexAlertNote, type HexAlerts } from '../hex-alerts';
import { makeKeyedEncounterNote } from '../keyed-encounters';

import { executeLeg } from './execute-leg';

import type { WeatherCommitted } from '@achm/core';
import type {
  CampaignDate,
  DayEndEventPayload,
  DayStartEventPayload,
  EncounterCheckEventPayload,
  KeyedEncounter,
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
  | { type: 'encounter_check'; payload: EncounterCheckEventPayload }
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
    // Entered a hex with a scripted (keyed) encounter that triggers on entry.
    | 'paused_keyed_encounter'
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
  /**
   * Whether a random encounter check fired at the hex where the run paused.
   * Multiple triggers can fire on one hex, but the runner reports a single
   * `status`; a random encounter can therefore be masked by a keyed one. The
   * random roll is the one trigger the display can't re-derive from hex data
   * (keyed encounters and alerts it looks up itself), so it is carried here so
   * every trigger can still be surfaced. Absent when nothing paused.
   */
  randomEncounterTriggered?: boolean;
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
  /** Entry-triggered keyed (scripted) encounters per route hex */
  keyedEncounters: Record<string, KeyedEncounter[]>;
  /** Arrival alerts (unknown clues / GM updates) per route hex */
  hexAlerts: Record<string, HexAlerts>;
  /**
   * Skip the random encounter check (the per-hex d20 roll) on every hex — the
   * `--no-rec` flag. Keyed (scripted) encounters and arrival alerts still fire;
   * only the random roll is suppressed. Preserved across day rollovers.
   */
  skipRandomEncounters?: boolean;
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

    // Check the hex just entered for keyed (scripted) encounters, arrival
    // alerts (unknown clues / live anchored beats / GM updates), and a random encounter roll. All are
    // checked AFTER the move so the party pauses IN the flagged hex, and a
    // later resume picks up at the next leg without re-checking this hex. When
    // several fire at once every note still lands in the log; we pause once,
    // preferring the most actionable status (keyed encounter > random
    // encounter > alert), but carry `randomEncounterTriggered` on the result so
    // the display can surface a random encounter even when a keyed one won the
    // status. The display re-derives keyed encounters and alerts from hex data.
    const finalSegments = {
      active: activeSegmentsToday,
      daylight: daylightSegmentsToday,
      night: nightSegmentsToday,
    };
    const atDestination = currentLegIndex >= state.route.length;

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

    // Keyed encounters are scripted — they always trigger on entry, no roll.
    const keyed = state.keyedEncounters[destHex] ?? [];
    if (keyed.length > 0) {
      events.push({
        type: 'note',
        payload: {
          text: makeKeyedEncounterNote(destHex, keyed),
          scope: 'session',
        },
      });
    }

    // Random encounter check. Independent of any keyed encounter — a scripted
    // event and a wandering one can both happen in the same hex. Suppressed
    // entirely when the journey runs with random encounter checks off
    // (`--no-rec`); keyed encounters and alerts above are unaffected.
    const threshold = state.encounterChances[destHex] ?? 0;
    let rolledEncounter = false;
    if (!state.skipRandomEncounters) {
      const check = rollEncounterOccurs(threshold);
      rolledEncounter = check.triggered;
      // Log the raw roll whenever a die was actually rolled (threshold > 0),
      // so the actual d20 result is available for diagnostics even when the
      // check doesn't trigger an encounter.
      if (check.roll !== null) {
        events.push({
          type: 'encounter_check',
          payload: {
            hexId: destHex,
            threshold,
            roll: check.roll,
            triggered: rolledEncounter,
          },
        });
      }
    }
    if (rolledEncounter) {
      // Log a prompt for the GM to roll the encounter manually.
      events.push({
        type: 'note',
        payload: {
          text: makeEncounterNote(destHex, threshold),
          scope: 'session',
        },
      });
    }

    // Decide whether to pause. A keyed encounter or a random encounter is
    // actionable enough to pause for; an arrival alert pauses only mid-route
    // (at the destination the journey is over anyway, so we complete — the
    // alert note is still logged and the completion handler displays it). A
    // keyed encounter likewise pauses only mid-route: at the destination the
    // completion handler surfaces it.
    if (keyed.length > 0 && !atDestination) {
      return {
        status: 'paused_keyed_encounter',
        currentLegIndex,
        events,
        finalSegments,
        randomEncounterTriggered: rolledEncounter,
      };
    }
    if (rolledEncounter) {
      return {
        status: 'paused_encounter',
        currentLegIndex,
        events,
        finalSegments,
        randomEncounterTriggered: true,
      };
    }
    if (alerted && !atDestination) {
      return {
        status: 'paused_hex_alert',
        currentLegIndex,
        events,
        finalSegments,
        randomEncounterTriggered: rolledEncounter,
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

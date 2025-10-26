import { makeEncounterNote } from '../helpers/encounters';

import { executeLeg } from './execute-leg';

import type { WeatherCommitted } from '@skyreach/core';
import type {
  CampaignDate,
  EncounterTableData,
  Pace,
  Season,
} from '@skyreach/schemas';

/**
 * Events that can occur during fast travel execution.
 */
export type FastTravelEvent =
  | { type: 'move'; from: string | null; to: string; pace: Pace }
  | {
      type: 'time_log';
      segments: number;
      daylightSegments: number;
      nightSegments: number;
      phase: 'daylight' | 'night';
    }
  | { type: 'note'; text: string; scope: 'day' | 'session' }
  | {
      type: 'day_end';
      summary: {
        active: number;
        daylight: number;
        night: number;
      };
    }
  | {
      type: 'day_start';
      date: CampaignDate;
      season: string;
      daylightCap: number;
    }
  | { type: 'weather_committed'; weather: WeatherCommitted };

/**
 * Result of executing fast travel.
 */
export interface FastTravelResult {
  /** Status of the fast travel execution */
  status:
    | 'completed'
    | 'paused_encounter'
    | 'paused_no_capacity'
    | 'paused_stale';
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
  /** Encounter table to use */
  encounterTable: EncounterTableData;
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

    // Check for encounter entering this hex
    const encounterNote = makeEncounterNote(destHex, state.encounterTable);
    if (encounterNote) {
      // Encounter occurred - emit note and pause
      events.push({
        type: 'note',
        text: encounterNote,
        scope: 'session',
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

    // Try to execute the leg
    const legResult = executeLeg(
      destHex,
      state.pace,
      activeSegmentsToday,
      daylightSegmentsLeft,
      state.daylightCapSegments,
      state.weather,
    );

    if (!legResult.canExecute) {
      if (legResult.reason === 'no_capacity') {
        // Out of capacity for today - pause
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
      from: fromHex,
      to: destHex,
      pace: state.pace,
    });

    events.push({
      type: 'time_log',
      segments: legResult.segmentsUsed,
      daylightSegments: legResult.daylightSegmentsUsed,
      nightSegments: legResult.nightSegmentsUsed,
      phase: 'daylight', // For MVP, all travel is during daylight
    });

    // Update state
    activeSegmentsToday += legResult.segmentsUsed;
    daylightSegmentsToday += legResult.daylightSegmentsUsed;
    nightSegmentsToday += legResult.nightSegmentsUsed;
    daylightSegmentsLeft -= legResult.daylightSegmentsUsed;
    currentHex = destHex;
    currentLegIndex++;
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

import { slowsTravel } from '@achm/core';

import { isDifficultHex } from '../hex-data';

import type { WeatherCommitted } from '@achm/core';
import type { Pace } from '@achm/schemas';

/**
 * Result of attempting to execute a leg of travel.
 */
export interface LegExecutionResult {
  /** Whether the leg can be executed */
  canExecute: boolean;
  /** Reason for the result */
  reason: 'fits' | 'no_capacity' | 'new_day_needed';
  /** Total segments the leg will consume (if canExecute) */
  segmentsUsed: number;
  /** Daylight segments consumed (if canExecute) */
  daylightSegmentsUsed: number;
  /** Night segments consumed (if canExecute) */
  nightSegmentsUsed: number;
}

/**
 * Base segments for each pace (before doublers).
 * From spec: Fast=3, Normal=4, Slow=6 (segments = 0.5h units)
 */
const PACE_BASE_SEGMENTS: Record<Pace, number> = {
  fast: 3,
  normal: 4,
  slow: 6,
};

/**
 * Activity cap in segments (12 hours = 24 segments).
 */
const ACTIVITY_CAP_SEGMENTS = 24;

/**
 * Calculate the total segments required for a leg, including terrain and weather doublers.
 * Only one doubler is applied - if both terrain and weather would double, only apply one.
 *
 * @param destHex The destination hex ID
 * @param pace The travel pace
 * @param weather Current weather (null if none)
 * @returns Total segments required
 */
export function calculateLegSegments(
  destHex: string,
  pace: Pace,
  weather: WeatherCommitted | null,
): number {
  let segments = PACE_BASE_SEGMENTS[pace];

  // Apply doubler if either terrain is difficult OR weather slows travel
  // Only apply ONE doubler, not both
  const terrainDoubles = isDifficultHex(destHex);
  const weatherDoubles = weather && slowsTravel(weather);

  if (terrainDoubles || weatherDoubles) {
    segments *= 2;
  }

  return segments;
}

/**
 * Arguments for executing a leg of fast travel.
 */
export interface ExecuteLegArgs {
  /** The destination hex ID */
  destHex: string;
  /** The travel pace */
  pace: Pace;
  /** Segments already used today (before this leg) */
  activeSegmentsToday: number;
  /** Remaining daylight segments available */
  daylightSegmentsLeft: number;
  /** Total daylight cap for the day */
  daylightCapSegments: number;
  /** Current weather (null if none) */
  weather: WeatherCommitted | null;
}

/**
 * Execute a single leg of fast travel, determining if it fits within capacity constraints.
 *
 * This is a pure function that does NOT perform I/O. It only calculates whether
 * a leg can be executed given the current state.
 *
 * @param args Arguments for leg execution
 * @returns Result indicating if leg can execute and segment breakdown
 */
export function executeLeg(args: ExecuteLegArgs): LegExecutionResult {
  const {
    destHex,
    pace,
    activeSegmentsToday,
    daylightSegmentsLeft,
    daylightCapSegments,
    weather,
  } = args;
  const totalSegments = calculateLegSegments(destHex, pace, weather);

  // Check activity cap (12 hours = 24 segments)
  const activeAfterLeg = activeSegmentsToday + totalSegments;
  if (activeAfterLeg > ACTIVITY_CAP_SEGMENTS) {
    return {
      canExecute: false,
      reason: 'no_capacity',
      segmentsUsed: 0,
      daylightSegmentsUsed: 0,
      nightSegmentsUsed: 0,
    };
  }

  // Check daylight cap
  if (totalSegments > daylightSegmentsLeft) {
    return {
      canExecute: false,
      reason: 'new_day_needed',
      segmentsUsed: 0,
      daylightSegmentsUsed: 0,
      nightSegmentsUsed: 0,
    };
  }

  // Leg fits! Calculate daylight vs night breakdown
  // All segments fit within daylight
  const daylightSegmentsUsed = totalSegments;
  const nightSegmentsUsed = 0;

  return {
    canExecute: true,
    reason: 'fits',
    segmentsUsed: totalSegments,
    daylightSegmentsUsed,
    nightSegmentsUsed,
  };
}

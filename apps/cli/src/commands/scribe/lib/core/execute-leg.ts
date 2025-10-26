import { isInclement } from '@skyreach/core';

import { isDifficultHex } from '../helpers/hex-data';

import type { Pace, WeatherCommitted } from '@skyreach/schemas';

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

  // Apply terrain doubler if destination is difficult
  if (isDifficultHex(destHex)) {
    segments *= 2;
  }

  // Apply weather doubler if weather is inclement
  if (weather && isInclement(weather)) {
    segments *= 2;
  }

  return segments;
}

/**
 * Execute a single leg of fast travel, determining if it fits within capacity constraints.
 *
 * This is a pure function that does NOT perform I/O. It only calculates whether
 * a leg can be executed given the current state.
 *
 * @param destHex The destination hex ID
 * @param pace The travel pace
 * @param activeSegmentsToday Segments already used today (before this leg)
 * @param daylightSegmentsLeft Remaining daylight segments available
 * @param daylightCapSegments Total daylight cap for the day
 * @param weather Current weather (null if none)
 * @returns Result indicating if leg can execute and segment breakdown
 */
export function executeLeg(
  destHex: string,
  pace: Pace,
  activeSegmentsToday: number,
  daylightSegmentsLeft: number,
  daylightCapSegments: number,
  weather: WeatherCommitted | null,
): LegExecutionResult {
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

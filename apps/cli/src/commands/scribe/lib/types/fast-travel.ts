import type { Pace } from '@achm/schemas';

/**
 * Fast travel plan persisted to disk.
 * Tracks the current state of fast travel execution.
 */
export interface FastTravelPlan {
  groupId: string; // UUID for this plan
  sessionId: string; // Session ID (can be number or dev string)
  startHex: string;
  destHex: string;
  pace: Pace;
  route: string[]; // Full route [A, B, C, ..., Z]
  legIndex: number; // Next leg to execute: route[legIndex] -> route[legIndex+1]
  activeSegmentsToday: number; // Segments of activity used today
  daylightSegmentsLeft: number; // Remaining daylight segments
  hasWeatherForToday: boolean; // Whether weather has been committed for today
  lastSeq: number; // Last event seq written (for integrity check)
  lastHash: string; // Hash of recent log tail (for integrity check)
  currentHash: string; // Current log hash at last execution
}

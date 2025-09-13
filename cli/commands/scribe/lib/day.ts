import { STEP_HOURS } from '../constants.ts';

export function hoursToSegmentsCeil(hours: number) {
  return Math.ceil(hours / STEP_HOURS);
}

export function segmentsToHours(segments: number) {
  return segments * STEP_HOURS;
}

import { STEP_HOURS } from '@skyreach/schemas';

export function hoursToSegmentsCeil(hours: number) {
  return Math.ceil(hours / STEP_HOURS);
}

export function segmentsToHours(segments: number) {
  return segments * STEP_HOURS;
}

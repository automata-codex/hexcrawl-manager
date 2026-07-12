import { appendEvent } from '../../../../services/event-log.service';

/**
 * Emit an encounter_check event (the raw d20 roll against a hex's threshold).
 * @returns The sequence number of the emitted event
 */
export function emitEncounterCheck(
  file: string,
  hexId: string,
  threshold: number,
  roll: number,
  triggered: boolean,
): number {
  const event = appendEvent(file, 'encounter_check', {
    hexId,
    threshold,
    roll,
    triggered,
  });
  return event.seq;
}

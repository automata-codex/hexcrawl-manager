import { FastTravelEvent } from '../core/fast-travel-runner';

import { emitEncounterCheck } from './emit-encounter-check';
import { emitMove } from './emit-move';
import { emitNote } from './emit-note';
import { emitTimeLog } from './emit-time-log';

/**
 * Emit all events from a fast travel result to the event log.
 */
export function emitFastTravelEvents(file: string, events: FastTravelEvent[]) {
  for (const event of events) {
    switch (event.type) {
      case 'move':
        emitMove(
          file,
          event.payload.from,
          event.payload.to,
          event.payload.pace,
        );
        break;
      case 'time_log':
        emitTimeLog(
          file,
          event.payload.segments,
          event.payload.daylightSegments,
          event.payload.nightSegments,
          event.payload.phase,
        );
        break;
      case 'note':
        emitNote(file, event.payload.text, event.payload.scope);
        break;
      case 'encounter_check':
        emitEncounterCheck(
          file,
          event.payload.hexId,
          event.payload.threshold,
          event.payload.roll,
          event.payload.triggered,
        );
        break;
    }
  }
}

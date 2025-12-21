import { appendEvent } from '../../../../services/event-log.service';

import type { Pace } from '@achm/schemas';

/**
 * Emit a move event.
 * @returns The sequence number of the emitted event
 */
export function emitMove(
  file: string,
  from: string | null,
  to: string,
  pace: Pace,
): number {
  const event = appendEvent(file, 'move', { from, to, pace });
  return event.seq;
}

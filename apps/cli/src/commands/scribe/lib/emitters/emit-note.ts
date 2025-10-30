import { appendEvent } from '../../../../services/event-log.service';

/**
 * Emit a note event.
 * @returns The sequence number of the emitted event
 */
export function emitNote(
  file: string,
  text: string,
  scope: 'day' | 'session' = 'session',
): number {
  const event = appendEvent(file, 'note', { text, scope });
  return event.seq;
}

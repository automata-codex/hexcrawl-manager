import { appendEvent } from '../../../../services/event-log.service';

/**
 * Emit a weather_committed event.
 * Note: The actual weather payload would need to be generated
 * by rolling weather. For now, this is a placeholder.
 * @returns An object with the sequence number and payload
 */
export function emitWeatherCommitted(
  file: string,
  payload: any,
): { seq: number; payload: any } {
  const event = appendEvent(file, 'weather_committed', payload);
  return { seq: event.seq, payload };
}

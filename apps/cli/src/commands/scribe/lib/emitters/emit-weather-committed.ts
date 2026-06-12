import { appendEvent } from '../../../../services/event-log.service';

import type { WeatherCommittedEventPayload } from '@achm/schemas';

/**
 * Emit a weather_committed event.
 * @returns The sequence number of the emitted event
 */
export function emitWeatherCommitted(
  file: string,
  payload: WeatherCommittedEventPayload,
): number {
  const event = appendEvent(file, 'weather_committed', payload);
  return event.seq;
}

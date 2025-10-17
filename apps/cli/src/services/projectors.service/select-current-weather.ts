/** Returns the most recent WeatherCommitted payload from the event log, or null if none. */
import type { WeatherCommitted } from '@skyreach/core';
import type { ScribeEvent } from '@skyreach/schemas';

export function selectCurrentWeather(
  events: ScribeEvent[],
): WeatherCommitted | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.kind === 'weather_committed' && e.payload) {
      return e.payload as WeatherCommitted;
    }
  }
  return null;
}

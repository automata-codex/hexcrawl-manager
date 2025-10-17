/** Returns the most recent forecastAfter value from a previous day's weather_committed event, or 0 if none. */
import { datesEqual, type WeatherCommitted } from '@skyreach/core';
import type { ScribeEvent } from '@skyreach/schemas';
import { lastCalendarDate } from './last-calendar-date';

export function selectCurrentForecast(events: ScribeEvent[]): number {
  const today = lastCalendarDate(events);
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (
      e.kind === 'weather_committed' &&
      e.payload &&
      typeof e.payload === 'object'
    ) {
      const eventDate = (e.payload as WeatherCommitted).date;
      if (datesEqual(today, eventDate)) {
        continue; // skip today's weather
      }
      const forecast = (e.payload as WeatherCommitted).forecastAfter;
      if (typeof forecast === 'number') {
        return forecast;
      }
    }
  }
  return 0;
}

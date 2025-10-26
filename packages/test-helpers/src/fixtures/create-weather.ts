import type { WeatherCategory, WeatherCommitted } from '@skyreach/core';

export const createWeather = (category: WeatherCategory): WeatherCommitted => ({
  category: category,
  date: { year: 1512, month: 'Florara', day: 1 },
  forecastAfter: 0,
  forecastBefore: 0,
  roll2d6: 7,
  season: 'spring',
  total: 7,
});

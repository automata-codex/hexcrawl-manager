import { describe, expect, it } from 'vitest';

import { isInclement } from './is-inclement';

import type { WeatherCommitted } from '../types';

const createWeather = (category: string): WeatherCommitted => ({
  category: category as any,
  date: { year: 1512, month: 'Florara', day: 1 },
  forecastAfter: 0,
  forecastBefore: 0,
  roll2d6: 7,
  season: 'spring',
  total: 7,
});

describe('isInclement', () => {
  it('returns false for Pleasant weather', () => {
    expect(isInclement(createWeather('Pleasant'))).toBe(false);
  });

  it('returns true for Unpleasant weather', () => {
    expect(isInclement(createWeather('Unpleasant'))).toBe(true);
  });

  it('returns true for Inclement weather', () => {
    expect(isInclement(createWeather('Inclement'))).toBe(true);
  });

  it('returns true for Extreme weather', () => {
    expect(isInclement(createWeather('Extreme'))).toBe(true);
  });
});

import { createWeather } from '@skyreach/test-helpers';
import { describe, expect, it } from 'vitest';

import { slowsTravel } from './slows-travel';

describe('slowsTravel', () => {
  it('returns false for Pleasant weather', () => {
    expect(slowsTravel(createWeather('nice'))).toBe(false);
  });

  it('returns true for Unpleasant weather', () => {
    expect(slowsTravel(createWeather('unpleasant'))).toBe(true);
  });

  it('returns true for Inclement weather', () => {
    expect(slowsTravel(createWeather('inclement'))).toBe(true);
  });

  it('returns true for Extreme weather', () => {
    expect(slowsTravel(createWeather('extreme'))).toBe(true);
  });
});

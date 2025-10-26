import {
  MockInstance,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import * as hexData from '../helpers/hex-data';

import { calculateLegSegments, executeLeg } from './execute-leg';

import type { WeatherCommitted } from '@skyreach/schemas';

describe('calculateLegSegments', () => {
  // eslint-disable-next-line no-unused-vars
  let isDifficultHexSpy: MockInstance<(hexId: string) => boolean>;

  beforeEach(() => {
    isDifficultHexSpy = vi.spyOn(hexData, 'isDifficultHex');
  });

  afterEach(() => {
    isDifficultHexSpy.mockRestore();
  });

  it('calculates base segments for normal pace', () => {
    isDifficultHexSpy.mockReturnValue(false);
    expect(calculateLegSegments('P12', 'normal', null)).toBe(2);
  });

  it('calculates base segments for fast pace', () => {
    isDifficultHexSpy.mockReturnValue(false);
    expect(calculateLegSegments('P12', 'fast', null)).toBe(1);
  });

  it('calculates base segments for slow pace', () => {
    isDifficultHexSpy.mockReturnValue(false);
    expect(calculateLegSegments('P12', 'slow', null)).toBe(3);
  });

  it('applies terrain doubler for difficult hex', () => {
    isDifficultHexSpy.mockReturnValue(true);
    expect(calculateLegSegments('W23', 'normal', null)).toBe(4); // 2 * 2
  });

  it('applies weather doubler for inclement weather', () => {
    isDifficultHexSpy.mockReturnValue(false);
    const weather: WeatherCommitted = {
      category: 'Inclement',
      description: 'Heavy rain',
    };
    expect(calculateLegSegments('P12', 'normal', weather)).toBe(4); // 2 * 2
  });

  it('applies both terrain and weather doublers', () => {
    isDifficultHexSpy.mockReturnValue(true);
    const weather: WeatherCommitted = {
      category: 'Inclement',
      description: 'Heavy rain',
    };
    expect(calculateLegSegments('W23', 'normal', weather)).toBe(8); // 2 * 2 * 2
  });

  it('does not apply weather doubler for pleasant weather', () => {
    isDifficultHexSpy.mockReturnValue(false);
    const weather: WeatherCommitted = {
      category: 'Pleasant',
      description: 'Clear skies',
    };
    expect(calculateLegSegments('P12', 'normal', weather)).toBe(2);
  });

  it('handles fast pace with all doublers', () => {
    isDifficultHexSpy.mockReturnValue(true);
    const weather: WeatherCommitted = {
      category: 'Extreme',
      description: 'Blizzard',
    };
    expect(calculateLegSegments('W23', 'fast', weather)).toBe(4); // 1 * 2 * 2
  });
});

describe('executeLeg', () => {
  // eslint-disable-next-line no-unused-vars
  let isDifficultHexSpy: MockInstance<(hexId: string) => boolean>;

  beforeEach(() => {
    isDifficultHexSpy = vi.spyOn(hexData, 'isDifficultHex');
  });

  afterEach(() => {
    isDifficultHexSpy.mockRestore();
  });

  it('allows leg that fits within both caps', () => {
    isDifficultHexSpy.mockReturnValue(false);

    const result = executeLeg(
      'P12',
      'normal',
      0, // no prior activity
      24, // 12h daylight available
      24, // 12h daylight cap
      null,
    );

    expect(result.canExecute).toBe(true);
    expect(result.reason).toBe('fits');
    expect(result.segmentsUsed).toBe(2);
    expect(result.daylightSegmentsUsed).toBe(2);
    expect(result.nightSegmentsUsed).toBe(0);
  });

  it('rejects leg that exceeds activity cap', () => {
    isDifficultHexSpy.mockReturnValue(false);

    const result = executeLeg(
      'P12',
      'normal',
      15, // 7.5h already used
      24,
      24,
      null,
    );

    // activeAfterLeg = 15 + 2 = 17 > 16 (activity cap)
    expect(result.canExecute).toBe(false);
    expect(result.reason).toBe('no_capacity');
    expect(result.segmentsUsed).toBe(0);
  });

  it('rejects leg that exceeds daylight cap', () => {
    isDifficultHexSpy.mockReturnValue(false);

    const result = executeLeg(
      'P12',
      'normal',
      0,
      1, // only 0.5h daylight left
      24,
      null,
    );

    // totalSegments = 2 > daylightSegmentsLeft = 1
    expect(result.canExecute).toBe(false);
    expect(result.reason).toBe('new_day_needed');
    expect(result.segmentsUsed).toBe(0);
  });

  it('allows leg that exactly reaches activity cap', () => {
    isDifficultHexSpy.mockReturnValue(false);

    const result = executeLeg(
      'P12',
      'normal',
      14, // 7h already used
      24,
      24,
      null,
    );

    // activeAfterLeg = 14 + 2 = 16 (exactly at cap)
    expect(result.canExecute).toBe(true);
    expect(result.reason).toBe('fits');
    expect(result.segmentsUsed).toBe(2);
  });

  it('allows leg that exactly uses remaining daylight', () => {
    isDifficultHexSpy.mockReturnValue(false);

    const result = executeLeg(
      'P12',
      'normal',
      0,
      2, // exactly 1h daylight left
      24,
      null,
    );

    expect(result.canExecute).toBe(true);
    expect(result.reason).toBe('fits');
    expect(result.segmentsUsed).toBe(2);
    expect(result.daylightSegmentsUsed).toBe(2);
  });

  it('handles difficult terrain increasing segment cost', () => {
    isDifficultHexSpy.mockReturnValue(true);

    const result = executeLeg(
      'W23',
      'normal',
      0,
      24,
      24,
      null,
    );

    // totalSegments = 2 * 2 = 4
    expect(result.canExecute).toBe(true);
    expect(result.segmentsUsed).toBe(4);
    expect(result.daylightSegmentsUsed).toBe(4);
  });

  it('handles inclement weather increasing segment cost', () => {
    isDifficultHexSpy.mockReturnValue(false);

    const weather: WeatherCommitted = {
      category: 'Inclement',
      description: 'Heavy rain',
    };

    const result = executeLeg('P12', 'normal', 0, 24, 24, weather);

    // totalSegments = 2 * 2 = 4
    expect(result.canExecute).toBe(true);
    expect(result.segmentsUsed).toBe(4);
    expect(result.daylightSegmentsUsed).toBe(4);
  });

  it('handles both terrain and weather doublers', () => {
    isDifficultHexSpy.mockReturnValue(true);

    const weather: WeatherCommitted = {
      category: 'Extreme',
      description: 'Blizzard',
    };

    const result = executeLeg('W23', 'normal', 0, 24, 24, weather);

    // totalSegments = 2 * 2 * 2 = 8
    expect(result.canExecute).toBe(true);
    expect(result.segmentsUsed).toBe(8);
    expect(result.daylightSegmentsUsed).toBe(8);
  });

  it('rejects when doublers cause activity cap exceeded', () => {
    isDifficultHexSpy.mockReturnValue(true);

    const weather: WeatherCommitted = {
      category: 'Inclement',
      description: 'Heavy rain',
    };

    const result = executeLeg(
      'W23',
      'normal',
      10, // 5h already used
      24,
      24,
      weather,
    );

    // totalSegments = 2 * 2 * 2 = 8
    // activeAfterLeg = 10 + 8 = 18 > 16
    expect(result.canExecute).toBe(false);
    expect(result.reason).toBe('no_capacity');
  });

  it('rejects when doublers cause daylight exceeded', () => {
    isDifficultHexSpy.mockReturnValue(true);

    const weather: WeatherCommitted = {
      category: 'Inclement',
      description: 'Heavy rain',
    };

    const result = executeLeg(
      'W23',
      'normal',
      0,
      6, // only 3h daylight left
      24,
      weather,
    );

    // totalSegments = 2 * 2 * 2 = 8 > 6
    expect(result.canExecute).toBe(false);
    expect(result.reason).toBe('new_day_needed');
  });

  it('handles fast pace with minimal time', () => {
    isDifficultHexSpy.mockReturnValue(false);

    const result = executeLeg(
      'P12',
      'fast',
      15, // 7.5h used
      1, // 0.5h daylight
      24,
      null,
    );

    // totalSegments = 1
    // activeAfterLeg = 15 + 1 = 16 (at cap)
    expect(result.canExecute).toBe(true);
    expect(result.segmentsUsed).toBe(1);
  });

  it('handles slow pace', () => {
    isDifficultHexSpy.mockReturnValue(false);

    const result = executeLeg('P12', 'slow', 0, 24, 24, null);

    // totalSegments = 3
    expect(result.canExecute).toBe(true);
    expect(result.segmentsUsed).toBe(3);
    expect(result.daylightSegmentsUsed).toBe(3);
  });

  it('handles slow pace with difficult terrain', () => {
    isDifficultHexSpy.mockReturnValue(true);

    const result = executeLeg('W23', 'slow', 0, 24, 24, null);

    // totalSegments = 3 * 2 = 6
    expect(result.canExecute).toBe(true);
    expect(result.segmentsUsed).toBe(6);
    expect(result.daylightSegmentsUsed).toBe(6);
  });
});

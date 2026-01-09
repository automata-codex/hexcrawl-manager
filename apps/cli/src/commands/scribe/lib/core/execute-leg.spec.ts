import { createWeather } from '@achm/test-helpers';
import {
  MockInstance,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import * as hexData from '../hex-data';

import { calculateLegSegments, executeLeg } from './execute-leg';

import type { WeatherCommitted } from '@achm/core';

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
    expect(calculateLegSegments('P12', 'normal', null)).toBe(4);
  });

  it('calculates base segments for fast pace', () => {
    isDifficultHexSpy.mockReturnValue(false);
    expect(calculateLegSegments('P12', 'fast', null)).toBe(3);
  });

  it('calculates base segments for slow pace', () => {
    isDifficultHexSpy.mockReturnValue(false);
    expect(calculateLegSegments('P12', 'slow', null)).toBe(6);
  });

  it('applies terrain doubler for difficult hex', () => {
    isDifficultHexSpy.mockReturnValue(true);
    expect(calculateLegSegments('W23', 'normal', null)).toBe(8); // 4 * 2
  });

  it('applies weather doubler for inclement weather', () => {
    isDifficultHexSpy.mockReturnValue(false);
    const weather: WeatherCommitted = createWeather('inclement');
    expect(calculateLegSegments('P12', 'normal', weather)).toBe(8); // 4 * 2
  });

  it('applies only one doubler when both terrain and weather would double', () => {
    isDifficultHexSpy.mockReturnValue(true);
    const weather: WeatherCommitted = createWeather('inclement');
    expect(calculateLegSegments('W23', 'normal', weather)).toBe(8); // 4 * 2 (only one doubler)
  });

  it('does not apply weather doubler for pleasant weather', () => {
    isDifficultHexSpy.mockReturnValue(false);
    const weather: WeatherCommitted = createWeather('nice');
    expect(calculateLegSegments('P12', 'normal', weather)).toBe(4);
  });

  it('handles fast pace with doubler (terrain + weather)', () => {
    isDifficultHexSpy.mockReturnValue(true);
    const weather: WeatherCommitted = createWeather('extreme');
    expect(calculateLegSegments('W23', 'fast', weather)).toBe(6); // 3 * 2 (only one doubler)
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

    const result = executeLeg({
      destHex: 'P12',
      pace: 'normal',
      activeSegmentsToday: 0, // no prior activity
      daylightSegmentsLeft: 24, // 12h daylight available
      daylightCapSegments: 24, // 12h daylight cap
      weather: null,
    });

    expect(result.canExecute).toBe(true);
    expect(result.reason).toBe('fits');
    expect(result.segmentsUsed).toBe(4);
    expect(result.daylightSegmentsUsed).toBe(4);
    expect(result.nightSegmentsUsed).toBe(0);
  });

  it('rejects leg that exceeds activity cap', () => {
    isDifficultHexSpy.mockReturnValue(false);

    const result = executeLeg({
      destHex: 'P12',
      pace: 'normal',
      activeSegmentsToday: 21, // 10.5h already used
      daylightSegmentsLeft: 24,
      daylightCapSegments: 24,
      weather: null,
    });

    // activeAfterLeg = 21 + 4 = 25 > 24 (activity cap)
    expect(result.canExecute).toBe(false);
    expect(result.reason).toBe('no_capacity');
    expect(result.segmentsUsed).toBe(0);
  });

  it('rejects leg that exceeds daylight cap', () => {
    isDifficultHexSpy.mockReturnValue(false);

    const result = executeLeg({
      destHex: 'P12',
      pace: 'normal',
      activeSegmentsToday: 0,
      daylightSegmentsLeft: 2, // only 1h daylight left
      daylightCapSegments: 24,
      weather: null,
    });

    // totalSegments = 4 > daylightSegmentsLeft = 2
    expect(result.canExecute).toBe(false);
    expect(result.reason).toBe('new_day_needed');
    expect(result.segmentsUsed).toBe(0);
  });

  it('allows leg that exactly reaches activity cap', () => {
    isDifficultHexSpy.mockReturnValue(false);

    const result = executeLeg({
      destHex: 'P12',
      pace: 'normal',
      activeSegmentsToday: 20, // 10h already used
      daylightSegmentsLeft: 24,
      daylightCapSegments: 24,
      weather: null,
    });

    // activeAfterLeg = 20 + 4 = 24 (exactly at cap)
    expect(result.canExecute).toBe(true);
    expect(result.reason).toBe('fits');
    expect(result.segmentsUsed).toBe(4);
  });

  it('allows leg that exactly uses remaining daylight', () => {
    isDifficultHexSpy.mockReturnValue(false);

    const result = executeLeg({
      destHex: 'P12',
      pace: 'normal',
      activeSegmentsToday: 0,
      daylightSegmentsLeft: 4, // exactly 2h daylight left
      daylightCapSegments: 24,
      weather: null,
    });

    expect(result.canExecute).toBe(true);
    expect(result.reason).toBe('fits');
    expect(result.segmentsUsed).toBe(4);
    expect(result.daylightSegmentsUsed).toBe(4);
  });

  it('handles difficult terrain increasing segment cost', () => {
    isDifficultHexSpy.mockReturnValue(true);

    const result = executeLeg({
      destHex: 'W23',
      pace: 'normal',
      activeSegmentsToday: 0,
      daylightSegmentsLeft: 24,
      daylightCapSegments: 24,
      weather: null,
    });

    // totalSegments = 4 * 2 = 8
    expect(result.canExecute).toBe(true);
    expect(result.segmentsUsed).toBe(8);
    expect(result.daylightSegmentsUsed).toBe(8);
  });

  it('handles inclement weather increasing segment cost', () => {
    isDifficultHexSpy.mockReturnValue(false);

    const weather: WeatherCommitted = createWeather('inclement');

    const result = executeLeg({
      destHex: 'P12',
      pace: 'normal',
      activeSegmentsToday: 0,
      daylightSegmentsLeft: 24,
      daylightCapSegments: 24,
      weather,
    });

    // totalSegments = 4 * 2 = 8
    expect(result.canExecute).toBe(true);
    expect(result.segmentsUsed).toBe(8);
    expect(result.daylightSegmentsUsed).toBe(8);
  });

  it('handles terrain and weather applying only one doubler', () => {
    isDifficultHexSpy.mockReturnValue(true);

    const weather: WeatherCommitted = createWeather('extreme');

    const result = executeLeg({
      destHex: 'W23',
      pace: 'normal',
      activeSegmentsToday: 0,
      daylightSegmentsLeft: 24,
      daylightCapSegments: 24,
      weather,
    });

    // totalSegments = 4 * 2 = 8 (only one doubler)
    expect(result.canExecute).toBe(true);
    expect(result.segmentsUsed).toBe(8);
    expect(result.daylightSegmentsUsed).toBe(8);
  });

  it('rejects when doubler causes activity cap exceeded', () => {
    isDifficultHexSpy.mockReturnValue(true);

    const weather: WeatherCommitted = createWeather('inclement');

    const result = executeLeg({
      destHex: 'W23',
      pace: 'normal',
      activeSegmentsToday: 17, // 8.5h already used
      daylightSegmentsLeft: 24,
      daylightCapSegments: 24,
      weather,
    });

    // totalSegments = 4 * 2 = 8 (only one doubler)
    // activeAfterLeg = 17 + 8 = 25 > 24
    expect(result.canExecute).toBe(false);
    expect(result.reason).toBe('no_capacity');
  });

  it('rejects when doubler causes daylight exceeded', () => {
    isDifficultHexSpy.mockReturnValue(true);

    const weather: WeatherCommitted = createWeather('inclement');

    const result = executeLeg({
      destHex: 'W23',
      pace: 'normal',
      activeSegmentsToday: 0,
      daylightSegmentsLeft: 7, // only 3.5h daylight left
      daylightCapSegments: 24,
      weather,
    });

    // totalSegments = 4 * 2 = 8 (only one doubler) > 7
    expect(result.canExecute).toBe(false);
    expect(result.reason).toBe('new_day_needed');
  });

  it('handles fast pace with minimal time', () => {
    isDifficultHexSpy.mockReturnValue(false);

    const result = executeLeg({
      destHex: 'P12',
      pace: 'fast',
      activeSegmentsToday: 21, // 10.5h used
      daylightSegmentsLeft: 3, // 1.5h daylight
      daylightCapSegments: 24,
      weather: null,
    });

    // totalSegments = 3
    // activeAfterLeg = 21 + 3 = 24 (at cap)
    expect(result.canExecute).toBe(true);
    expect(result.segmentsUsed).toBe(3);
  });

  it('handles slow pace', () => {
    isDifficultHexSpy.mockReturnValue(false);

    const result = executeLeg({
      destHex: 'P12',
      pace: 'slow',
      activeSegmentsToday: 0,
      daylightSegmentsLeft: 24,
      daylightCapSegments: 24,
      weather: null,
    });

    // totalSegments = 6
    expect(result.canExecute).toBe(true);
    expect(result.segmentsUsed).toBe(6);
    expect(result.daylightSegmentsUsed).toBe(6);
  });

  it('handles slow pace with difficult terrain', () => {
    isDifficultHexSpy.mockReturnValue(true);

    const result = executeLeg({
      destHex: 'W23',
      pace: 'slow',
      activeSegmentsToday: 0,
      daylightSegmentsLeft: 24,
      daylightCapSegments: 24,
      weather: null,
    });

    // totalSegments = 6 * 2 = 12
    expect(result.canExecute).toBe(true);
    expect(result.segmentsUsed).toBe(12);
    expect(result.daylightSegmentsUsed).toBe(12);
  });
});

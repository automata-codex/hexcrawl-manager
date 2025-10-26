import { createWeather } from '@skyreach/test-helpers';
import {
  MockInstance,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import * as encounters from '../helpers/encounters';
import * as hexData from '../helpers/hex-data';

import { runFastTravel } from './fast-travel-runner';

import type { FastTravelState } from './fast-travel-runner';
import type { EncounterTableData } from '@skyreach/schemas';

describe('runFastTravel', () => {
  // eslint-disable-next-line no-unused-vars
  let makeEncounterNoteSpy: MockInstance<(hexId: string, table: {
    mainTable: {
      weight: number;
      category: string;
      label: string;
    }[];
    categoryTables: Record<string, Record<string, {
      weight: number;
      encounterId: string;
    }[]>>;
  }) => string>;
  // eslint-disable-next-line no-unused-vars
  let isDifficultHexSpy: MockInstance<(hexId: string) => boolean>;

  const mockEncounterTable: EncounterTableData = {
    mainTable: [{ category: 'wildlife', label: 'Wildlife', weight: 20 }],
    categoryTables: {
      wildlife: {
        '1': [{ encounterId: 'bear', weight: 20 }],
      },
    },
  };

  beforeEach(() => {
    makeEncounterNoteSpy = vi.spyOn(encounters, 'makeEncounterNote');
    isDifficultHexSpy = vi.spyOn(hexData, 'isDifficultHex');

    // Default: no encounters, no difficult terrain
    makeEncounterNoteSpy.mockReturnValue('');
    isDifficultHexSpy.mockReturnValue(false);
  });

  afterEach(() => {
    makeEncounterNoteSpy.mockRestore();
    isDifficultHexSpy.mockRestore();
  });

  it('completes a simple 2-leg journey', () => {
    const state: FastTravelState = {
      currentHex: 'P12',
      route: ['P13', 'P14'],
      currentLegIndex: 0,
      pace: 'normal',
      activeSegmentsToday: 0,
      daylightSegmentsToday: 0,
      nightSegmentsToday: 0,
      daylightSegmentsLeft: 24,
      daylightCapSegments: 24,
      weather: null,
      currentDate: { year: 1, month: 'Hibernis', day: 15 },
      currentSeason: 'spring',
      encounterTable: mockEncounterTable,
    };

    const result = runFastTravel(state);

    expect(result.status).toBe('completed');
    expect(result.currentLegIndex).toBe(2);
    expect(result.events).toHaveLength(4); // 2 moves + 2 time_logs

    // Check first leg
    expect(result.events[0]).toEqual({
      type: 'move',
      payload: {
        from: 'P12',
        to: 'P13',
        pace: 'normal',
      },
    });
    expect(result.events[1]).toEqual({
      type: 'time_log',
      payload: {
        segments: 4,
        daylightSegments: 4,
        nightSegments: 0,
        phase: 'daylight',
      },
    });

    // Check second leg
    expect(result.events[2]).toEqual({
      type: 'move',
      payload: {
        from: 'P13',
        to: 'P14',
        pace: 'normal',
      },
    });
    expect(result.events[3]).toEqual({
      type: 'time_log',
      payload: {
        segments: 4,
        daylightSegments: 4,
        nightSegments: 0,
        phase: 'daylight',
      },
    });

    // Check final segments
    expect(result.finalSegments).toEqual({
      active: 8,
      daylight: 8,
      night: 0,
    });
  });

  it('pauses when encounter occurs on first leg', () => {
    makeEncounterNoteSpy.mockReturnValue(
      'Encounter entering P13: Wildlife - bear',
    );

    const state: FastTravelState = {
      currentHex: 'P12',
      route: ['P13', 'P14'],
      currentLegIndex: 0,
      pace: 'normal',
      activeSegmentsToday: 0,
      daylightSegmentsToday: 0,
      nightSegmentsToday: 0,
      daylightSegmentsLeft: 24,
      daylightCapSegments: 24,
      weather: null,
      currentDate: { year: 1, month: 'Hibernis', day: 15 },
      currentSeason: 'spring',
      encounterTable: mockEncounterTable,
    };

    const result = runFastTravel(state);

    expect(result.status).toBe('paused_encounter');
    expect(result.currentLegIndex).toBe(0); // Still on first leg
    expect(result.events).toHaveLength(1); // Only the encounter note

    expect(result.events[0]).toEqual({
      type: 'note',
      payload: {
        text: 'Encounter entering P13: Wildlife - bear',
        scope: 'session',
      },
    });

    // No segments used yet
    expect(result.finalSegments).toEqual({
      active: 0,
      daylight: 0,
      night: 0,
    });
  });

  it('pauses when encounter occurs on second leg', () => {
    makeEncounterNoteSpy
      .mockReturnValueOnce('') // No encounter on P13
      .mockReturnValueOnce('Encounter entering P14: Wildlife - bear'); // Encounter on P14

    const state: FastTravelState = {
      currentHex: 'P12',
      route: ['P13', 'P14'],
      currentLegIndex: 0,
      pace: 'normal',
      activeSegmentsToday: 0,
      daylightSegmentsToday: 0,
      nightSegmentsToday: 0,
      daylightSegmentsLeft: 24,
      daylightCapSegments: 24,
      weather: null,
      currentDate: { year: 1, month: 'Hibernis', day: 15 },
      currentSeason: 'spring',
      encounterTable: mockEncounterTable,
    };

    const result = runFastTravel(state);

    expect(result.status).toBe('paused_encounter');
    expect(result.currentLegIndex).toBe(1); // On second leg
    expect(result.events).toHaveLength(3); // move + time_log for first leg, note for second

    expect(result.finalSegments).toEqual({
      active: 4,
      daylight: 4,
      night: 0,
    });
  });

  it('pauses when activity cap would be exceeded', () => {
    const state: FastTravelState = {
      currentHex: 'P12',
      route: ['P13', 'P14'],
      currentLegIndex: 0,
      pace: 'normal',
      activeSegmentsToday: 21, // Already used 10.5h
      daylightSegmentsToday: 21,
      nightSegmentsToday: 0,
      daylightSegmentsLeft: 3,
      daylightCapSegments: 24,
      weather: null,
      currentDate: { year: 1, month: 'Hibernis', day: 15 },
      currentSeason: 'spring',
      encounterTable: mockEncounterTable,
    };

    const result = runFastTravel(state);

    expect(result.status).toBe('paused_no_capacity');
    expect(result.currentLegIndex).toBe(0); // Can't execute first leg
    expect(result.events).toHaveLength(0); // No events

    expect(result.finalSegments).toEqual({
      active: 21,
      daylight: 21,
      night: 0,
    });
  });

  it('pauses when daylight cap would be exceeded', () => {
    const state: FastTravelState = {
      currentHex: 'P12',
      route: ['P13', 'P14'],
      currentLegIndex: 0,
      pace: 'normal',
      activeSegmentsToday: 0,
      daylightSegmentsToday: 0,
      nightSegmentsToday: 0,
      daylightSegmentsLeft: 2, // Only 1h daylight left
      daylightCapSegments: 24,
      weather: null,
      currentDate: { year: 1, month: 'Hibernis', day: 15 },
      currentSeason: 'spring',
      encounterTable: mockEncounterTable,
    };

    const result = runFastTravel(state);

    expect(result.status).toBe('paused_no_capacity');
    expect(result.currentLegIndex).toBe(0);
    expect(result.events).toHaveLength(0);
  });

  it('completes multi-leg journey', () => {
    const state: FastTravelState = {
      currentHex: 'P12',
      route: ['P13', 'P14', 'P15', 'P16'],
      currentLegIndex: 0,
      pace: 'fast',
      activeSegmentsToday: 0,
      daylightSegmentsToday: 0,
      nightSegmentsToday: 0,
      daylightSegmentsLeft: 24,
      daylightCapSegments: 24,
      weather: null,
      currentDate: { year: 1, month: 'Hibernis', day: 15 },
      currentSeason: 'spring',
      encounterTable: mockEncounterTable,
    };

    const result = runFastTravel(state);

    expect(result.status).toBe('completed');
    expect(result.currentLegIndex).toBe(4);
    expect(result.events).toHaveLength(8); // 4 moves + 4 time_logs

    // Each leg should use 3 segments (fast pace)
    expect(result.finalSegments).toEqual({
      active: 12,
      daylight: 12,
      night: 0,
    });
  });

  it('handles difficult terrain doubling time', () => {
    isDifficultHexSpy.mockReturnValue(true); // All hexes are difficult

    const state: FastTravelState = {
      currentHex: 'W22',
      route: ['W23', 'W24'],
      currentLegIndex: 0,
      pace: 'normal',
      activeSegmentsToday: 0,
      daylightSegmentsToday: 0,
      nightSegmentsToday: 0,
      daylightSegmentsLeft: 24,
      daylightCapSegments: 24,
      weather: null,
      currentDate: { year: 1, month: 'Hibernis', day: 15 },
      currentSeason: 'spring',
      encounterTable: mockEncounterTable,
    };

    const result = runFastTravel(state);

    expect(result.status).toBe('completed');
    expect(result.currentLegIndex).toBe(2);

    // Each leg uses 8 segments (4 * 2 for difficult terrain)
    expect(result.finalSegments).toEqual({
      active: 16,
      daylight: 16,
      night: 0,
    });
  });

  it('handles inclement weather doubling time', () => {
    const state: FastTravelState = {
      currentHex: 'P12',
      route: ['P13', 'P14'],
      currentLegIndex: 0,
      pace: 'normal',
      activeSegmentsToday: 0,
      daylightSegmentsToday: 0,
      nightSegmentsToday: 0,
      daylightSegmentsLeft: 24,
      daylightCapSegments: 24,
      weather: createWeather('inclement'),
      currentDate: { year: 1, month: 'Hibernis', day: 15 },
      currentSeason: 'spring',
      encounterTable: mockEncounterTable,
    };

    const result = runFastTravel(state);

    expect(result.status).toBe('completed');

    // Each leg uses 8 segments (4 * 2 for inclement weather)
    expect(result.finalSegments).toEqual({
      active: 16,
      daylight: 16,
      night: 0,
    });
  });

  it('resumes from partway through route', () => {
    const state: FastTravelState = {
      currentHex: 'P13',
      route: ['P13', 'P14', 'P15'],
      currentLegIndex: 1, // Resume from P14
      pace: 'normal',
      activeSegmentsToday: 4, // Already used 2h
      daylightSegmentsToday: 4,
      nightSegmentsToday: 0,
      daylightSegmentsLeft: 20,
      daylightCapSegments: 24,
      weather: null,
      currentDate: { year: 1, month: 'Hibernis', day: 15 },
      currentSeason: 'spring',
      encounterTable: mockEncounterTable,
    };

    const result = runFastTravel(state);

    expect(result.status).toBe('completed');
    expect(result.currentLegIndex).toBe(3);
    expect(result.events).toHaveLength(4); // 2 remaining legs

    // Started with 4 segments, added 8 more (2 legs * 4 segments)
    expect(result.finalSegments).toEqual({
      active: 12,
      daylight: 12,
      night: 0,
    });
  });

  it('handles slow pace', () => {
    const state: FastTravelState = {
      currentHex: 'P12',
      route: ['P13'],
      currentLegIndex: 0,
      pace: 'slow',
      activeSegmentsToday: 0,
      daylightSegmentsToday: 0,
      nightSegmentsToday: 0,
      daylightSegmentsLeft: 24,
      daylightCapSegments: 24,
      weather: null,
      currentDate: { year: 1, month: 'Hibernis', day: 15 },
      currentSeason: 'spring',
      encounterTable: mockEncounterTable,
    };

    const result = runFastTravel(state);

    expect(result.status).toBe('completed');

    // Slow pace uses 6 segments
    expect(result.finalSegments).toEqual({
      active: 6,
      daylight: 6,
      night: 0,
    });
  });

  it('applies only one doubler for terrain and weather combined', () => {
    isDifficultHexSpy.mockReturnValue(true);

    const state: FastTravelState = {
      currentHex: 'W22',
      route: ['W23'],
      currentLegIndex: 0,
      pace: 'normal',
      activeSegmentsToday: 0,
      daylightSegmentsToday: 0,
      nightSegmentsToday: 0,
      daylightSegmentsLeft: 24,
      daylightCapSegments: 24,
      weather: createWeather('extreme'),
      currentDate: { year: 1, month: 'Aridus', day: 15 },
      currentSeason: 'winter',
      encounterTable: mockEncounterTable,
    };

    const result = runFastTravel(state);

    expect(result.status).toBe('completed');

    // Only one doubler applied: 4 * 2 = 8 segments
    expect(result.finalSegments).toEqual({
      active: 8,
      daylight: 8,
      night: 0,
    });
  });
});

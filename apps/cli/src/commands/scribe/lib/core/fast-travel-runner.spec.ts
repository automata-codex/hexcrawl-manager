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
      from: 'P12',
      to: 'P13',
      pace: 'normal',
    });
    expect(result.events[1]).toEqual({
      type: 'time_log',
      segments: 2,
      daylightSegments: 2,
      nightSegments: 0,
      phase: 'daylight',
    });

    // Check second leg
    expect(result.events[2]).toEqual({
      type: 'move',
      from: 'P13',
      to: 'P14',
      pace: 'normal',
    });
    expect(result.events[3]).toEqual({
      type: 'time_log',
      segments: 2,
      daylightSegments: 2,
      nightSegments: 0,
      phase: 'daylight',
    });

    // Check final segments
    expect(result.finalSegments).toEqual({
      active: 4,
      daylight: 4,
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
      text: 'Encounter entering P13: Wildlife - bear',
      scope: 'session',
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
      active: 2,
      daylight: 2,
      night: 0,
    });
  });

  it('pauses when activity cap would be exceeded', () => {
    const state: FastTravelState = {
      currentHex: 'P12',
      route: ['P13', 'P14'],
      currentLegIndex: 0,
      pace: 'normal',
      activeSegmentsToday: 15, // Already used 7.5h
      daylightSegmentsToday: 15,
      nightSegmentsToday: 0,
      daylightSegmentsLeft: 9,
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
      active: 15,
      daylight: 15,
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
      daylightSegmentsLeft: 1, // Only 0.5h daylight left
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

    // Each leg should use 1 segment (fast pace)
    expect(result.finalSegments).toEqual({
      active: 4,
      daylight: 4,
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

    // Each leg uses 4 segments (2 * 2 for difficult terrain)
    expect(result.finalSegments).toEqual({
      active: 8,
      daylight: 8,
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
      weather: {
        category: 'Inclement',
        description: 'Heavy rain',
      },
      currentDate: { year: 1, month: 'Hibernis', day: 15 },
      currentSeason: 'spring',
      encounterTable: mockEncounterTable,
    };

    const result = runFastTravel(state);

    expect(result.status).toBe('completed');

    // Each leg uses 4 segments (2 * 2 for inclement weather)
    expect(result.finalSegments).toEqual({
      active: 8,
      daylight: 8,
      night: 0,
    });
  });

  it('resumes from partway through route', () => {
    const state: FastTravelState = {
      currentHex: 'P13',
      route: ['P13', 'P14', 'P15'],
      currentLegIndex: 1, // Resume from P14
      pace: 'normal',
      activeSegmentsToday: 2, // Already used 1h
      daylightSegmentsToday: 2,
      nightSegmentsToday: 0,
      daylightSegmentsLeft: 22,
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

    // Started with 2 segments, added 4 more (2 legs * 2 segments)
    expect(result.finalSegments).toEqual({
      active: 6,
      daylight: 6,
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

    // Slow pace uses 3 segments
    expect(result.finalSegments).toEqual({
      active: 3,
      daylight: 3,
      night: 0,
    });
  });

  it('combines terrain and weather doublers', () => {
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
      weather: {
        category: 'Extreme',
        description: 'Blizzard',
      },
      currentDate: { year: 1, month: 'Aridus', day: 15 },
      currentSeason: 'winter',
      encounterTable: mockEncounterTable,
    };

    const result = runFastTravel(state);

    expect(result.status).toBe('completed');

    // TODO It should only apply one doubler for difficult terrain + extreme weather
    // 2 * 2 (terrain) * 2 (weather) = 8 segments
    expect(result.finalSegments).toEqual({
      active: 8,
      daylight: 8,
      night: 0,
    });
  });
});

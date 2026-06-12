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

import * as encounters from '../encounters';
import * as hexData from '../hex-data';

import { runFastTravel } from './fast-travel-runner';

import type { FastTravelState } from './fast-travel-runner';

function makeState(overrides: Partial<FastTravelState> = {}): FastTravelState {
  return {
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
    // Threshold 0 = encounters never occur unless a test sets a hex's chance.
    encounterChances: {},
    // No arrival alerts unless a test sets a hex's counts.
    hexAlerts: {},
    ...overrides,
  };
}

describe('runFastTravel', () => {
  // eslint-disable-next-line no-unused-vars
  let isDifficultHexSpy: MockInstance<(hexId: string) => boolean>;

  beforeEach(() => {
    isDifficultHexSpy = vi.spyOn(hexData, 'isDifficultHex');

    // Default: no difficult terrain
    isDifficultHexSpy.mockReturnValue(false);
  });

  afterEach(() => {
    isDifficultHexSpy.mockRestore();
  });

  it('completes a simple 2-leg journey', () => {
    const result = runFastTravel(makeState());

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

  it('pauses IN the encounter hex when an encounter occurs on the first leg', () => {
    // Threshold 20 = always occurs entering P13.
    const result = runFastTravel(makeState({ encounterChances: { P13: 20 } }));

    expect(result.status).toBe('paused_encounter');
    expect(result.currentLegIndex).toBe(1); // P13 entered; next leg is P14
    expect(result.events).toHaveLength(3); // move + time_log into P13, then the note

    // The party travels INTO the hex before pausing.
    expect(result.events[0]).toEqual({
      type: 'move',
      payload: { from: 'P12', to: 'P13', pace: 'normal' },
    });

    // The note prompts the GM to roll the encounter manually — fast travel
    // does not auto-pick one.
    expect(result.events[2]).toEqual({
      type: 'note',
      payload: {
        text: 'Encounter check triggered entering P13 (rolled ≤ 20). Roll on the region table, resolve it, then `fast resume`.',
        scope: 'session',
      },
    });

    // The leg's travel time was spent
    expect(result.finalSegments).toEqual({
      active: 4,
      daylight: 4,
      night: 0,
    });
  });

  it('pauses when encounter occurs on second leg', () => {
    // No chance on P13, always on P14.
    const result = runFastTravel(makeState({ encounterChances: { P14: 20 } }));

    expect(result.status).toBe('paused_encounter');
    expect(result.currentLegIndex).toBe(2); // P14 entered; route exhausted on resume
    expect(result.events).toHaveLength(5); // both legs' move + time_log, note for P14

    expect(result.finalSegments).toEqual({
      active: 8,
      daylight: 8,
      night: 0,
    });
  });

  it('does not roll an encounter for a hex the party could not enter', () => {
    // P13 would always trigger, but the leg doesn't fit today's daylight.
    const result = runFastTravel(
      makeState({
        encounterChances: { P13: 20 },
        daylightSegmentsLeft: 2,
      }),
    );

    expect(result.status).toBe('paused_no_capacity');
    expect(result.events).toHaveLength(0); // no move, and no encounter note
  });

  it('pauses when activity cap would be exceeded', () => {
    const result = runFastTravel(
      makeState({
        activeSegmentsToday: 21, // Already used 10.5h
        daylightSegmentsToday: 21,
        daylightSegmentsLeft: 3,
      }),
    );

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
    const result = runFastTravel(
      makeState({
        daylightSegmentsLeft: 2, // Only 1h daylight left
      }),
    );

    expect(result.status).toBe('paused_no_capacity');
    expect(result.currentLegIndex).toBe(0);
    expect(result.events).toHaveLength(0);
  });

  it('completes multi-leg journey', () => {
    const result = runFastTravel(
      makeState({
        route: ['P13', 'P14', 'P15', 'P16'],
        pace: 'fast',
      }),
    );

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

    const result = runFastTravel(
      makeState({
        currentHex: 'W22',
        route: ['W23', 'W24'],
      }),
    );

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
    const result = runFastTravel(
      makeState({
        weather: createWeather('inclement'),
      }),
    );

    expect(result.status).toBe('completed');

    // Each leg uses 8 segments (4 * 2 for inclement weather)
    expect(result.finalSegments).toEqual({
      active: 16,
      daylight: 16,
      night: 0,
    });
  });

  it('resumes from partway through route', () => {
    const result = runFastTravel(
      makeState({
        currentHex: 'P13',
        route: ['P13', 'P14', 'P15'],
        currentLegIndex: 1, // Resume from P14
        activeSegmentsToday: 4, // Already used 2h
        daylightSegmentsToday: 4,
        daylightSegmentsLeft: 20,
      }),
    );

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
    const result = runFastTravel(
      makeState({
        route: ['P13'],
        pace: 'slow',
      }),
    );

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

    const result = runFastTravel(
      makeState({
        currentHex: 'W22',
        route: ['W23'],
        weather: createWeather('extreme'),
        currentDate: { year: 1, month: 'Aridus', day: 15 },
        currentSeason: 'winter',
      }),
    );

    expect(result.status).toBe('completed');

    // Only one doubler applied: 4 * 2 = 8 segments
    expect(result.finalSegments).toEqual({
      active: 8,
      daylight: 8,
      night: 0,
    });
  });

  it('does not roll an encounter for hexes with no chance entry', () => {
    const makeEncounterNoteSpy = vi.spyOn(encounters, 'makeEncounterNote');

    const result = runFastTravel(makeState());

    expect(result.status).toBe('completed');
    expect(makeEncounterNoteSpy).not.toHaveBeenCalled();
    makeEncounterNoteSpy.mockRestore();
  });

  it('pauses IN a mid-route hex with arrival alerts and logs a note', () => {
    const result = runFastTravel(
      makeState({ hexAlerts: { P13: { unknownClues: 2, updates: 1 } } }),
    );

    expect(result.status).toBe('paused_hex_alert');
    expect(result.currentLegIndex).toBe(1); // P13 entered; next leg is P14

    // The party travels INTO the hex before pausing, and the alert is
    // recorded in the session log.
    expect(result.events).toHaveLength(3); // move + time_log into P13, then the note
    expect(result.events[2]).toEqual({
      type: 'note',
      payload: {
        text: 'Hex alert at P13: 2 unknown clue(s), 1 GM update(s) — see hex P13.',
        scope: 'session',
      },
    });
  });

  it('completes (does not pause) when only the destination has alerts, still logging the note', () => {
    const result = runFastTravel(
      makeState({ hexAlerts: { P14: { unknownClues: 1, updates: 0 } } }),
    );

    expect(result.status).toBe('completed');
    expect(result.currentLegIndex).toBe(2);
    expect(result.events).toHaveLength(5); // both legs' move + time_log, alert note for P14
    expect(result.events[4]).toEqual({
      type: 'note',
      payload: {
        text: 'Hex alert at P14: 1 unknown clue(s) — see hex P14.',
        scope: 'session',
      },
    });
  });

  it('pauses once with encounter status when a hex triggers both, logging both notes', () => {
    const result = runFastTravel(
      makeState({
        encounterChances: { P13: 20 },
        hexAlerts: { P13: { unknownClues: 1, updates: 0 } },
      }),
    );

    expect(result.status).toBe('paused_encounter');
    expect(result.currentLegIndex).toBe(1);
    expect(result.events).toHaveLength(4); // move + time_log, alert note, encounter note
    expect(result.events[2].type).toBe('note');
    expect(result.events[3].type).toBe('note');
  });

  it('ignores zero-count alert entries', () => {
    const result = runFastTravel(
      makeState({ hexAlerts: { P13: { unknownClues: 0, updates: 0 } } }),
    );

    expect(result.status).toBe('completed');
    expect(result.events).toHaveLength(4); // no notes
  });

  it('does not check alerts for a hex the party could not enter', () => {
    const result = runFastTravel(
      makeState({
        hexAlerts: { P13: { unknownClues: 1, updates: 0 } },
        daylightSegmentsLeft: 2,
      }),
    );

    expect(result.status).toBe('paused_no_capacity');
    expect(result.events).toHaveLength(0); // no move, and no alert note
  });
});

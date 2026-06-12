import { CALENDAR_CONFIG } from '@achm/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as eventLog from '../../../../services/event-log.service';
import * as projectors from '../../../../services/projectors.service';
import { CalendarService } from '../../services/calendar';
import * as emitters from '../emitters';
import * as weather from '../weather';

import { driveJourney } from './drive-journey';
import * as runner from './fast-travel-runner';

import type { FastTravelResult, FastTravelState } from './fast-travel-runner';
import type { Context } from '../../types';
import type { EncounterTableData } from '@achm/schemas';

const FILE = 'session.jsonl';

const mockEncounterTable: EncounterTableData = {
  mainTable: [{ category: 'wildlife', label: 'Wildlife', weight: 20 }],
  categoryTables: { wildlife: { '1': [{ encounterId: 'bear', weight: 20 }] } },
};

// A winter day's daylight cap is 9h = 18 segments (see CALENDAR_CONFIG).
const WINTER_CAP = 18;
const SPRING_CAP = 24;

function baseState(overrides: Partial<FastTravelState> = {}): FastTravelState {
  return {
    currentHex: 'P12',
    route: ['P13', 'P14', 'P15', 'P16'],
    currentLegIndex: 0,
    pace: 'normal',
    activeSegmentsToday: 0,
    daylightSegmentsToday: 0,
    nightSegmentsToday: 0,
    daylightSegmentsLeft: WINTER_CAP,
    daylightCapSegments: WINTER_CAP,
    weather: null,
    currentDate: { year: 1, month: 'Hibernis', day: 15 }, // winter
    currentSeason: 'winter',
    encounterTable: mockEncounterTable,
    ...overrides,
  };
}

function result(overrides: Partial<FastTravelResult>): FastTravelResult {
  return {
    status: 'completed',
    currentLegIndex: 4,
    events: [],
    finalSegments: { active: 0, daylight: 0, night: 0 },
    ...overrides,
  };
}

// A non-empty events array marks "made progress this run".
const SOME_EVENTS: FastTravelResult['events'] = [
  { type: 'move', payload: { from: 'P13', to: 'P14', pace: 'normal' } },
];

describe('driveJourney', () => {
  let ctx: Context;

  beforeEach(() => {
    // Stub the I/O boundary so the orchestration logic runs without touching disk.
    vi.spyOn(eventLog, 'readEvents').mockReturnValue([]);
    vi.spyOn(projectors, 'selectCurrentForecast').mockReturnValue(0);
    vi.spyOn(emitters, 'emitFastTravelEvents').mockImplementation(() => {});
    vi.spyOn(emitters, 'emitDayEnd').mockReturnValue(0);
    vi.spyOn(emitters, 'emitDayStart').mockReturnValue(0);
    vi.spyOn(emitters, 'emitWeatherCommitted').mockReturnValue(0);
    vi.spyOn(weather, 'rollWeatherForDate').mockImplementation((date) => ({
      date,
      season: 'winter',
      roll2d6: 7,
      forecastBefore: 0,
      total: 7,
      category: 'pleasant',
      detail: null,
      forecastAfter: 0,
    }));

    ctx = {
      calendar: new CalendarService(CALENDAR_CONFIG),
    } as unknown as Context;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('walks a multi-day journey to completion, ending and starting each day', () => {
    const runSpy = vi
      .spyOn(runner, 'runFastTravel')
      .mockReturnValueOnce(
        result({
          status: 'paused_no_capacity',
          currentLegIndex: 2,
          events: SOME_EVENTS,
          finalSegments: { active: 16, daylight: 16, night: 0 },
        }),
      )
      .mockReturnValueOnce(
        result({
          status: 'completed',
          currentLegIndex: 4,
          finalSegments: { active: 8, daylight: 8, night: 0 },
        }),
      );

    const res = driveJourney(ctx, FILE, baseState());

    expect(res.status).toBe('completed');
    expect(emitters.emitDayEnd).toHaveBeenCalledTimes(1);
    expect(emitters.emitDayEnd).toHaveBeenCalledWith(FILE, 16, 16, 0);
    expect(emitters.emitDayStart).toHaveBeenCalledTimes(1);

    // Day-1 weather fill + one advanced day = two commits.
    expect(emitters.emitWeatherCommitted).toHaveBeenCalledTimes(2);

    // The second day resumes from where the first left off, with a fresh envelope.
    const day2 = runSpy.mock.calls[1][0];
    expect(day2.currentLegIndex).toBe(2);
    expect(day2.currentHex).toBe('P14'); // route[currentLegIndex - 1]
    expect(day2.activeSegmentsToday).toBe(0);
    expect(day2.daylightSegmentsLeft).toBe(WINTER_CAP);
    expect(day2.currentDate).toEqual({ year: 1, month: 'Hibernis', day: 16 });
  });

  it('recomputes the daylight envelope from the new date across a season boundary', () => {
    const runSpy = vi
      .spyOn(runner, 'runFastTravel')
      .mockReturnValueOnce(
        result({
          status: 'paused_no_capacity',
          currentLegIndex: 2,
          events: SOME_EVENTS,
          finalSegments: { active: 16, daylight: 16, night: 0 },
        }),
      )
      .mockReturnValueOnce(result({ status: 'completed', currentLegIndex: 4 }));

    // Hibernis 31 (winter) -> Vernalis 1 (spring): 9h -> 12h.
    driveJourney(
      ctx,
      FILE,
      baseState({ currentDate: { year: 1, month: 'Hibernis', day: 31 } }),
    );

    const day2 = runSpy.mock.calls[1][0];
    expect(day2.currentDate).toEqual({ year: 1, month: 'Vernalis', day: 1 });
    expect(day2.currentSeason).toBe('spring');
    expect(day2.daylightSegmentsLeft).toBe(SPRING_CAP);
    expect(day2.daylightCapSegments).toBe(SPRING_CAP);
    expect(emitters.emitDayStart).toHaveBeenCalledWith(
      FILE,
      { year: 1, month: 'Vernalis', day: 1 },
      'spring',
      SPRING_CAP,
    );
  });

  it('stops with error_no_progress when a leg cannot fit a fresh full day', () => {
    vi.spyOn(runner, 'runFastTravel').mockReturnValueOnce(
      result({
        status: 'paused_no_capacity',
        currentLegIndex: 0,
        events: [],
        finalSegments: { active: 0, daylight: 0, night: 0 },
      }),
    );

    const res = driveJourney(ctx, FILE, baseState());

    expect(res.status).toBe('error_no_progress');
    expect(emitters.emitDayEnd).not.toHaveBeenCalled();
    expect(emitters.emitDayStart).not.toHaveBeenCalled();
  });

  it('advances (does not error) when a leg cannot fit a partially-used opening day', () => {
    const runSpy = vi
      .spyOn(runner, 'runFastTravel')
      .mockReturnValueOnce(
        result({
          status: 'paused_no_capacity',
          currentLegIndex: 0,
          events: [], // no progress, but the day was already partly used
          finalSegments: { active: 16, daylight: 16, night: 0 },
        }),
      )
      .mockReturnValueOnce(result({ status: 'completed', currentLegIndex: 4 }));

    const res = driveJourney(
      ctx,
      FILE,
      baseState({
        activeSegmentsToday: 16,
        daylightSegmentsToday: 16,
        daylightSegmentsLeft: 2,
      }),
    );

    expect(res.status).toBe('completed');
    expect(emitters.emitDayEnd).toHaveBeenCalledWith(FILE, 16, 16, 0);
    expect(emitters.emitDayStart).toHaveBeenCalledTimes(1);
    // Still parked at the start hex (no leg has run yet).
    expect(runSpy.mock.calls[1][0].currentHex).toBe('P12');
    expect(runSpy.mock.calls[1][0].currentLegIndex).toBe(0);
  });

  it('auto-rolls weather for day 1 when none is committed, threading it into the run', () => {
    const runSpy = vi
      .spyOn(runner, 'runFastTravel')
      .mockReturnValueOnce(result({ status: 'completed', currentLegIndex: 4 }));

    driveJourney(ctx, FILE, baseState());

    expect(emitters.emitWeatherCommitted).toHaveBeenCalledTimes(1);
    // The rolled weather is threaded into the (single) day's run.
    expect(runSpy.mock.calls[0][0].weather).toMatchObject({
      category: 'pleasant',
    });
  });

  it('does not re-roll day-1 weather when it is already committed for the date', () => {
    const date = { year: 1, month: 'Hibernis', day: 15 };
    vi.spyOn(eventLog, 'readEvents').mockReturnValue([
      {
        seq: 1,
        ts: '2026-01-01T00:00:00.000Z',
        kind: 'weather_committed',
        payload: {
          date,
          season: 'winter',
          roll2d6: 5,
          forecastBefore: 0,
          total: 5,
          category: 'inclement',
          detail: null,
          forecastAfter: 0,
        },
      },
    ] as never);
    const runSpy = vi
      .spyOn(runner, 'runFastTravel')
      .mockReturnValueOnce(result({ status: 'completed', currentLegIndex: 4 }));

    driveJourney(ctx, FILE, baseState({ currentDate: date }));

    expect(emitters.emitWeatherCommitted).not.toHaveBeenCalled();
    expect(runSpy.mock.calls[0][0].weather).toMatchObject({
      category: 'inclement',
    });
  });
});

import * as cliKit from '@achm/cli-kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as eventLog from '../../../../services/event-log.service';
import * as projectors from '../../../../services/projectors.service';
import * as planIO from '../core/fast-travel-plan';
import * as hexAlerts from '../hex-alerts';
import * as keyedEncounters from '../keyed-encounters';

import { handleFastTravelResult } from './handle-fast-travel-result';

import type { FastTravelResult } from '../core/fast-travel-runner';
import type { FastTravelPlan } from '../types/fast-travel';

const FILE = 'session.jsonl';
const DATE = { year: 1, month: 'Hibernis', day: 15 } as const; // winter

const NO_ALERTS = {
  unknownClues: 0,
  liveBeats: 0,
  roleplayBooks: [] as string[],
  updates: 0,
};

function makePlan(overrides: Partial<FastTravelPlan> = {}): FastTravelPlan {
  return {
    groupId: 'g1',
    sessionId: 's1',
    startHex: 'P12',
    destHex: 'P16',
    pace: 'normal',
    route: ['P13', 'P14', 'P15', 'P16'],
    legIndex: 0,
    activeSegmentsToday: 0,
    daylightSegmentsLeft: 18,
    ...overrides,
  };
}

function makeResult(
  overrides: Partial<FastTravelResult> = {},
): FastTravelResult {
  return {
    status: 'paused_encounter',
    currentLegIndex: 1, // party entered route[0] = P13, next leg is P14
    events: [],
    finalSegments: { active: 8, daylight: 8, night: 0 },
    ...overrides,
  };
}

describe('handleFastTravelResult — surfacing every trigger on a hex', () => {
  beforeEach(() => {
    vi.spyOn(cliKit, 'info').mockImplementation(() => {});
    vi.spyOn(cliKit, 'error').mockImplementation(() => {});
    vi.spyOn(eventLog, 'readEvents').mockReturnValue([]);
    vi.spyOn(projectors, 'lastCalendarDate').mockReturnValue(DATE);
    vi.spyOn(planIO, 'savePlan').mockImplementation(() => {});
    vi.spyOn(planIO, 'deletePlan').mockImplementation(() => {});
    // Default: nothing on the hex. Individual tests add triggers.
    vi.spyOn(hexAlerts, 'getHexAlerts').mockReturnValue({ ...NO_ALERTS });
    vi.spyOn(keyedEncounters, 'getEntryKeyedEncounters').mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const infoLines = () => vi.mocked(cliKit.info).mock.calls.map((c) => c[0]);

  it('shows both the random encounter and a GM update on the paused hex', () => {
    // The user's reported case: an encounter and an update fire on one hex.
    vi.spyOn(hexAlerts, 'getHexAlerts').mockReturnValue({
      ...NO_ALERTS,
      updates: 1,
    });

    handleFastTravelResult(
      FILE,
      's1',
      makePlan(),
      makeResult({
        status: 'paused_encounter',
        randomEncounterTriggered: true,
      }),
    );

    // Paused IN P13 (route[legIndex - 1] once legIndex is persisted as 1).
    expect(infoLines()).toContain(
      '🎲 Encounter check triggered at P13 — roll on the region table.',
    );
    expect(infoLines()).toContain('📝 This hex has 1 GM update(s).');
  });

  it('surfaces the masked random encounter when a keyed encounter wins the status', () => {
    vi.spyOn(keyedEncounters, 'getEntryKeyedEncounters').mockReturnValue([
      { encounterId: 'enc-ambush', trigger: 'entry' },
    ]);
    vi.spyOn(hexAlerts, 'getHexAlerts').mockReturnValue({
      ...NO_ALERTS,
      unknownClues: 2,
    });

    handleFastTravelResult(
      FILE,
      's1',
      makePlan(),
      makeResult({
        status: 'paused_keyed_encounter',
        randomEncounterTriggered: true,
      }),
    );

    const lines = infoLines();
    expect(lines).toContain('⚔️ Keyed encounter(s) at P13: enc-ambush.');
    expect(lines).toContain(
      '🎲 Encounter check triggered at P13 — roll on the region table.',
    );
    expect(lines).toContain('🔍 2 unknown clue(s) here — see hex P13.');
  });

  it('shows keyed encounters and alerts together at the destination on completion', () => {
    vi.spyOn(keyedEncounters, 'getEntryKeyedEncounters').mockReturnValue([
      { encounterId: 'enc-boss', trigger: 'entry' },
    ]);
    vi.spyOn(hexAlerts, 'getHexAlerts').mockReturnValue({
      ...NO_ALERTS,
      updates: 1,
    });

    handleFastTravelResult(
      FILE,
      's1',
      makePlan({ legIndex: 4 }),
      makeResult({ status: 'completed', currentLegIndex: 4 }),
    );

    const lines = infoLines();
    expect(lines).toContain('⚔️ Keyed encounter(s) at P16: enc-boss.');
    expect(lines).toContain('📝 This hex has 1 GM update(s).');
  });

  it('persists progress and prompts `fast resume` on a day-rollover pause', () => {
    const savePlanSpy = vi.spyOn(planIO, 'savePlan');

    handleFastTravelResult(
      FILE,
      's1',
      makePlan(),
      makeResult({
        status: 'paused_day_rollover',
        currentLegIndex: 2,
        finalSegments: { active: 0, daylight: 0, night: 0 },
      }),
    );

    expect(savePlanSpy).toHaveBeenCalledWith(
      expect.objectContaining({ legIndex: 2, activeSegmentsToday: 0 }),
    );
    expect(infoLines()).toContain(
      'Fast travel paused for the night. Continue with `fast resume`.',
    );
  });
});

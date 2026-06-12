import { describe, expect, it } from 'vitest';

import { expectedResumeHex, verifyPlanPosition } from './fast-travel-plan';

import type { FastTravelPlan } from '../types/fast-travel';

const NOTATION = 'letter-number';

function makePlan(overrides: Partial<FastTravelPlan> = {}): FastTravelPlan {
  return {
    groupId: 'test-group',
    sessionId: 'dev-test',
    startHex: 'P12',
    destHex: 'P15',
    pace: 'normal',
    route: ['P13', 'P14', 'P15'],
    legIndex: 0,
    activeSegmentsToday: 0,
    daylightSegmentsLeft: 24,
    ...overrides,
  };
}

describe('expectedResumeHex', () => {
  it('is the start hex when no leg has run yet', () => {
    expect(expectedResumeHex(makePlan({ legIndex: 0 }))).toBe('P12');
  });

  it('is the previous route hex mid-journey', () => {
    expect(expectedResumeHex(makePlan({ legIndex: 2 }))).toBe('P14');
  });
});

describe('verifyPlanPosition', () => {
  it('accepts the party at the expected hex', () => {
    const plan = makePlan({ legIndex: 1 });
    expect(verifyPlanPosition(plan, 'P13', NOTATION)).toBe(true);
  });

  it('accepts case-insensitively via normalization', () => {
    const plan = makePlan({ legIndex: 1 });
    expect(verifyPlanPosition(plan, 'p13', NOTATION)).toBe(true);
  });

  it('rejects when the party has moved elsewhere', () => {
    const plan = makePlan({ legIndex: 1 });
    expect(verifyPlanPosition(plan, 'Q20', NOTATION)).toBe(false);
  });

  it('rejects when the current hex is unknown', () => {
    expect(verifyPlanPosition(makePlan(), null, NOTATION)).toBe(false);
  });

  it('fails closed on an unparseable hex ID', () => {
    const plan = makePlan({ legIndex: 1 });
    expect(verifyPlanPosition(plan, '???', NOTATION)).toBe(false);
  });
});

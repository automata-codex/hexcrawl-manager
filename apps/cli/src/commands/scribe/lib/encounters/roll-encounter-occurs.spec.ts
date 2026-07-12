import * as core from '@achm/core';
import {
  MockInstance,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { rollEncounterOccurs } from './roll-encounter-occurs';

describe('rollEncounterOccurs', () => {
  // eslint-disable-next-line no-unused-vars
  let rollDiceSpy: MockInstance<(notation: string) => number>;

  beforeEach(() => {
    rollDiceSpy = vi.spyOn(core, 'rollDice');
  });

  afterEach(() => {
    rollDiceSpy.mockRestore();
  });

  it('triggers, reporting the roll, when the roll is below the threshold', () => {
    rollDiceSpy.mockReturnValue(3);
    expect(rollEncounterOccurs(8)).toEqual({ roll: 3, triggered: true });
  });

  it('triggers when the roll equals the threshold', () => {
    rollDiceSpy.mockReturnValue(8);
    expect(rollEncounterOccurs(8)).toEqual({ roll: 8, triggered: true });
  });

  it('does not trigger, but still reports the roll, when above the threshold', () => {
    rollDiceSpy.mockReturnValue(9);
    expect(rollEncounterOccurs(8)).toEqual({ roll: 9, triggered: false });
  });

  it('never occurs at threshold 0 (and skips the roll, reporting roll: null)', () => {
    expect(rollEncounterOccurs(0)).toEqual({ roll: null, triggered: false });
    expect(rollDiceSpy).not.toHaveBeenCalled();
  });

  it('always occurs at threshold 20', () => {
    rollDiceSpy.mockReturnValue(20);
    expect(rollEncounterOccurs(20)).toEqual({ roll: 20, triggered: true });

    rollDiceSpy.mockReturnValue(1);
    expect(rollEncounterOccurs(20)).toEqual({ roll: 1, triggered: true });
  });
});

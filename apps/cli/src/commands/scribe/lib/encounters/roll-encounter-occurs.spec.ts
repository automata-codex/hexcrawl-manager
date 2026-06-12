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

  it('returns true when the roll is below the threshold', () => {
    rollDiceSpy.mockReturnValue(3);
    expect(rollEncounterOccurs(8)).toBe(true);
  });

  it('returns true when the roll equals the threshold', () => {
    rollDiceSpy.mockReturnValue(8);
    expect(rollEncounterOccurs(8)).toBe(true);
  });

  it('returns false when the roll is above the threshold', () => {
    rollDiceSpy.mockReturnValue(9);
    expect(rollEncounterOccurs(8)).toBe(false);
  });

  it('never occurs at threshold 0 (and skips the roll)', () => {
    expect(rollEncounterOccurs(0)).toBe(false);
    expect(rollDiceSpy).not.toHaveBeenCalled();
  });

  it('always occurs at threshold 20', () => {
    rollDiceSpy.mockReturnValue(20);
    expect(rollEncounterOccurs(20)).toBe(true);

    rollDiceSpy.mockReturnValue(1);
    expect(rollEncounterOccurs(20)).toBe(true);
  });
});

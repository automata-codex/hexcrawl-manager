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

  it('returns true when rolling a 1', () => {
    rollDiceSpy.mockReturnValue(1);
    expect(rollEncounterOccurs()).toBe(true);
  });

  it('returns false when rolling a 2-20', () => {
    rollDiceSpy.mockReturnValue(2);
    expect(rollEncounterOccurs()).toBe(false);

    rollDiceSpy.mockReturnValue(20);
    expect(rollEncounterOccurs()).toBe(false);
  });
});

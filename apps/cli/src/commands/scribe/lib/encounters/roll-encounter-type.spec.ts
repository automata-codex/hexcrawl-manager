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

import { rollEncounterType } from './roll-encounter-type';

import type { EncounterTableData } from '@achm/schemas';

describe('rollEncounterType', () => {
  // eslint-disable-next-line no-unused-vars
  let rollDiceSpy: MockInstance<(notation: string) => number>;

  beforeEach(() => {
    rollDiceSpy = vi.spyOn(core, 'rollDice');
  });

  afterEach(() => {
    rollDiceSpy.mockRestore();
  });

  const mockTable: EncounterTableData = {
    mainTable: [
      { category: 'wildlife', label: 'Wildlife', weight: 10 },
      { category: 'factions', label: 'Factions', weight: 10 },
    ],
    categoryTables: {},
  };

  it('returns first category when rolling in its range', () => {
    // Roll 1-10 should get Wildlife
    rollDiceSpy.mockReturnValue(1);
    expect(rollEncounterType(mockTable)).toBe('Wildlife');

    rollDiceSpy.mockReturnValue(10);
    expect(rollEncounterType(mockTable)).toBe('Wildlife');
  });

  it('returns second category when rolling in its range', () => {
    // Roll 11-20 should get Factions
    rollDiceSpy.mockReturnValue(11);
    expect(rollEncounterType(mockTable)).toBe('Factions');

    rollDiceSpy.mockReturnValue(20);
    expect(rollEncounterType(mockTable)).toBe('Factions');
  });
});

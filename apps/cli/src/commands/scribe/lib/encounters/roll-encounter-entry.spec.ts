import * as data from '@skyreach/data';
import {
  MockInstance,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { rollEncounterEntry } from './roll-encounter-entry';

import type { EncounterTableData } from '@skyreach/schemas';

describe('rollEncounterEntry', () => {
  // eslint-disable-next-line no-unused-vars
  let rollDiceSpy: MockInstance<(notation: string) => number>;

  beforeEach(() => {
    rollDiceSpy = vi.spyOn(data, 'rollDice');
  });

  afterEach(() => {
    rollDiceSpy.mockRestore();
  });

  const mockTable: EncounterTableData = {
    mainTable: [],
    categoryTables: {
      wildlife: {
        '1': [
          { encounterId: 'bear', weight: 10 },
          { encounterId: 'wolf', weight: 10 },
        ],
      },
    },
  };

  it('returns first entry when rolling in its range', () => {
    rollDiceSpy.mockReturnValue(1);
    expect(rollEncounterEntry('wildlife', mockTable)).toBe('bear');

    rollDiceSpy.mockReturnValue(10);
    expect(rollEncounterEntry('wildlife', mockTable)).toBe('bear');
  });

  it('returns second entry when rolling in its range', () => {
    rollDiceSpy.mockReturnValue(11);
    expect(rollEncounterEntry('wildlife', mockTable)).toBe('wolf');

    rollDiceSpy.mockReturnValue(20);
    expect(rollEncounterEntry('wildlife', mockTable)).toBe('wolf');
  });

  it('returns error message for unknown category', () => {
    const result = rollEncounterEntry('unknown', mockTable);
    expect(result).toContain('Unknown category');
  });
});

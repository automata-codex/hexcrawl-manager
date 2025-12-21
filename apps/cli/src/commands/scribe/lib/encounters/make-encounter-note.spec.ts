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

import { makeEncounterNote } from './make-encounter-note';

import type { EncounterTableData } from '@achm/schemas';

describe('makeEncounterNote', () => {
  // eslint-disable-next-line no-unused-vars
  let rollDiceSpy: MockInstance<(notation: string) => number>;

  beforeEach(() => {
    rollDiceSpy = vi.spyOn(core, 'rollDice');
  });

  afterEach(() => {
    rollDiceSpy.mockRestore();
  });

  const mockTable: EncounterTableData = {
    mainTable: [{ category: 'wildlife', label: 'Wildlife', weight: 20 }],
    categoryTables: {
      wildlife: {
        '1': [{ encounterId: 'bear', weight: 20 }],
      },
    },
  };

  it('returns null when no encounter occurs', () => {
    rollDiceSpy.mockReturnValue(11); // Roll 11 on d20
    expect(makeEncounterNote('P12', mockTable)).toBe(null);
  });

  it('returns formatted encounter note when encounter occurs', () => {
    // First call: rollEncounterOccurs (roll 1)
    // Second call: rollEncounterType (roll within Wildlife weight)
    // Third call: rollEncounterEntry (roll within bear weight)
    rollDiceSpy
      .mockReturnValueOnce(1) // Encounter occurs
      .mockReturnValueOnce(1) // First category
      .mockReturnValueOnce(1); // First entry

    const note = makeEncounterNote('P12', mockTable);
    expect(note).toContain('Encounter entering P12');
    expect(note).toContain('Wildlife');
    expect(note).toContain('bear');
  });
});

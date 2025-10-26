import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as data from '@skyreach/data';

import {
  makeEncounterNote,
  rollEncounterEntry,
  rollEncounterOccurs,
  rollEncounterType,
} from './encounters';

import type { EncounterTableData } from '@skyreach/schemas';

describe('rollEncounterOccurs', () => {
  let rollDiceSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rollDiceSpy = vi.spyOn(data, 'rollDice');
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

describe('rollEncounterType', () => {
  let rollDiceSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rollDiceSpy = vi.spyOn(data, 'rollDice');
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

describe('rollEncounterEntry', () => {
  let rollDiceSpy: ReturnType<typeof vi.spyOn>;

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


describe('makeEncounterNote', () => {
  let rollDiceSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rollDiceSpy = vi.spyOn(data, 'rollDice');
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

  it('returns empty string when no encounter occurs', () => {
    rollDiceSpy.mockReturnValue(11); // Roll 11 on d20
    expect(makeEncounterNote('P12', mockTable)).toBe('');
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

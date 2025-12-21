import { ApLedgerEntry } from '@skyreach/schemas';
import { makeAbsenceSpend } from '@skyreach/test-helpers';
import { describe, it, expect } from 'vitest';

import { aggregateApByCharacter } from './aggregate.js';

const LEDGER: ApLedgerEntry[] = [
  makeAbsenceSpend({
    characterId: 'char-a',
    session: 4,
    appliedAt: '2025-09-23T10:00:00Z',
    notes: 'Claimed one social point for missed session',
    deltas: { social: 1, combat: 0, exploration: 0 },
  }),
  makeAbsenceSpend({
    characterId: 'char-b',
    session: 3,
    appliedAt: '2025-09-16T10:00:00Z',
    notes: 'Covered two missed sessions before retirement',
    deltas: { combat: 1, exploration: 1, social: 0 },
  }),
];

describe('aggregateApByCharacter', () => {
  it('correctly aggregates AP by character', () => {
    const result = aggregateApByCharacter(LEDGER);
    expect(result).toEqual({
      'char-a': { combat: 0, exploration: 0, social: 1 },
      'char-b': { combat: 1, exploration: 1, social: 0 },
    });
  });
});

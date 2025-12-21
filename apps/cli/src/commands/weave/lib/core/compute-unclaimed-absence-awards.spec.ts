import {
  ApLedgerEntry,
  ApLedgerEntrySchema,
  CharacterData,
  CharacterSchema,
  SessionReportSchema,
} from '@achm/schemas';
import {
  makeAbsenceSpend,
  makeCompletedSessionReport,
  makePlannedSessionReport,
} from '@achm/test-helpers';
import { describe, it, expect } from 'vitest';

import { computeUnclaimedAbsenceAwards } from './compute-unclaimed-absence-awards';

// --- Characters ---

export const CHAR_A: CharacterData = CharacterSchema.parse({
  id: 'char-a',
  fullName: 'Quince Valebrook',
  displayName: 'Quince',
  pronouns: 'they/them',
  playerId: 'player-1',
  species: 'Human',
  culture: 'Vaulridge',
  class: 'Fighter', // from your ClassEnum
  level: 3,
  advancementPoints: { combat: 0, exploration: 0, social: 0 },
});

export const CHAR_B: CharacterData = CharacterSchema.parse({
  id: 'char-b',
  fullName: 'Istavan Khar',
  displayName: 'Istavan',
  pronouns: 'he/him',
  playerId: 'player-2',
  species: 'Elf',
  culture: 'Northwood',
  class: 'Ranger',
  level: 3,
  advancementPoints: { combat: 0, exploration: 0, social: 0 },
  lifecycle: {
    retiredAt: '2025-09-15', // real-world ISO date cutoff (inclusive window end)
    retiredReason: 'retired_by_player',
  },
});

export const CHAR_C: CharacterData = CharacterSchema.parse({
  id: 'char-c',
  fullName: 'Thava Morn',
  displayName: 'Thava',
  pronouns: 'she/her',
  playerId: 'player-3',
  species: 'Dragonborn',
  culture: 'Frontier',
  class: 'Bard',
  level: 3,
  advancementPoints: { combat: 0, exploration: 0, social: 0 },
});

// --- Sessions ---

/**
 * Campaign calendar (real-world):
 * s1 2025-09-01: A, B
 * s2 2025-09-08: A
 * s3 2025-09-15: A, C   (B is absent; B’s retiredAt === 2025-09-15)
 * s4 2025-09-22: C
 * s5 2025-09-29: A     (C is absent)
 * s6 planned (ignored)
 */
export const SESSIONS = [
  makeCompletedSessionReport({
    n: 1,
    date: '2025-09-01',
    present: ['char-a', 'char-b'],
  }),
  makeCompletedSessionReport({ n: 2, date: '2025-09-08', present: ['char-a'] }),
  makeCompletedSessionReport({
    n: 3,
    date: '2025-09-15',
    present: ['char-a', 'char-c'],
  }),
  makeCompletedSessionReport({ n: 4, date: '2025-09-22', present: ['char-c'] }),
  makeCompletedSessionReport({ n: 5, date: '2025-09-29', present: ['char-a'] }),
  makePlannedSessionReport({ n: 6 }), // should be ignored by status
];

// --- AP Ledger ---

/**
 * Absence spends recorded so far:
 * - A has already claimed 1 point (e.g., social) -> should zero out their single eligible miss (s4).
 * - B has already claimed 2 points across pillars -> should zero out s2 and s3.
 * - C has not claimed any -> should have 1 unclaimed from s5.
 */
export const LEDGER: ApLedgerEntry[] = [
  makeAbsenceSpend({
    characterId: 'char-a',
    session: 4, // attach to the most recent completed at the time of allocation
    appliedAt: '2025-09-23T10:00:00Z',
    notes: 'Claimed one social point for missed session',
    deltas: { social: 1 }, // combat/exploration default to 0
  }),
  makeAbsenceSpend({
    characterId: 'char-b',
    session: 3,
    appliedAt: '2025-09-16T10:00:00Z',
    notes: 'Covered two missed sessions before retirement',
    deltas: { combat: 1, exploration: 1 }, // social defaults to 0
  }),
];

// --- Expected result for happy-path assertion ---

/**
 * Using the algorithm:
 * - A introduced at s1; window end s5. Missed: s4 only => eligibleMissed = 1; claimed = 1; unclaimed = 0
 * - B introduced at s1; window end retiredAt=2025-09-15 (s3). Missed: s2, s3 => eligibleMissed = 2; claimed = 2; unclaimed = 0
 * - C introduced at s3; window end s5. Missed: s5 only => eligibleMissed = 1; claimed = 0; unclaimed = 1
 */
export const EXPECTED = [
  {
    characterId: 'char-a',
    displayName: 'Quince',
    eligibleMissed: 1,
    claimed: 1,
    unclaimed: 0,
  },
  {
    characterId: 'char-b',
    displayName: 'Istavan',
    eligibleMissed: 2,
    claimed: 2,
    unclaimed: 0,
  },
  {
    characterId: 'char-c',
    displayName: 'Thava',
    eligibleMissed: 1,
    claimed: 0,
    unclaimed: 1,
  },
] as const;

describe('computeUnclaimedAbsenceAwards (happy path)', () => {
  it('validates fixtures against schemas (sessions & ledger strict, characters relaxed for ClassEnum)', () => {
    // Sessions: strict parse
    const parsedSessions = SessionReportSchema.array().parse(SESSIONS);
    expect(parsedSessions.length).toBe(SESSIONS.length);

    // Ledger: strict parse
    const parsedLedger = ApLedgerEntrySchema.array().parse(LEDGER);
    expect(parsedLedger.length).toBe(LEDGER.length);

    // Characters already parsed via CharacterSchema above
    expect(CHAR_A.id).toBe('char-a');
    expect(CHAR_B.lifecycle?.retiredAt).toBe('2025-09-15');
  });

  it('computes unclaimed absence awards correctly', () => {
    const result = computeUnclaimedAbsenceAwards(
      SESSIONS,
      [CHAR_A, CHAR_B, CHAR_C],
      LEDGER,
    );

    // Compare as maps for order independence
    const toKey = (r: any) => r.characterId;
    const asMap = (arr: any[]) => new Map(arr.map((r) => [toKey(r), r]));

    const got = asMap(result);
    const want = asMap([...EXPECTED]);

    // Ensure all expected keys are present
    expect([...want.keys()].sort()).toEqual([...got.keys()].sort());

    // Per-character deep checks on the numeric fields
    for (const [id, exp] of want) {
      const r = got.get(id);
      expect(r).toBeTruthy();
      expect(r!.displayName).toBe(exp.displayName);
      expect(r!.eligibleMissed).toBe(exp.eligibleMissed);
      expect(r!.claimed).toBe(exp.claimed);
      expect(r!.unclaimed).toBe(exp.unclaimed);
    }
  });
});

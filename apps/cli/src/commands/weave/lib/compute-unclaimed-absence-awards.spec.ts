import { padSessionNum } from '@skyreach/core';
import {
  ApLedgerEntry,
  ApLedgerEntrySchema,
  CharacterData,
  CharacterSchema,
  SessionId,
  SessionReport,
  SessionReportSchema,
} from '@skyreach/schemas';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import { computeUnclaimedAbsenceAwards } from './compute-unclaimed-absence-awards';

// --- Helpers ---

const asSessionId = (n: number): z.infer<typeof SessionId> =>
  `session-${padSessionNum(n)}` as const;

function makeCompletedSession(opts: {
  n: number; // 1-based counter -> session id
  date: string; // YYYY-MM-DD real-world date
  present: string[]; // characterIds present
}): SessionReport {
  const id = asSessionId(opts.n);
  return {
    id,
    status: 'completed',
    // required header bits
    absenceAllocations: [],
    downtime: [],
    gameStartDate: '',
    schemaVersion: 2,
    scribeIds: [`session_${String(opts.n).padStart(4, '0')}_2025-09-01`], // any valid ScribeId shape
    sessionDate: opts.date,
    source: 'scribe',
    // completed-only
    advancementPoints: {
      combat: { number: 1, maxTier: 1 },
      exploration: { number: 1, maxTier: 1 },
      social: { number: 1, maxTier: 1 },
    },
    characterIds: [
      // Strings are PCs; objects would be guests (we omit guests here in happy path)
      ...opts.present,
    ],
    fingerprint: `fp-${id}`,
    gameEndDate: '',
    notes: [],
    todo: [],
    weave: { appliedAt: `${opts.date}T12:00:00.000Z`, version: '1' },
  };
}

function makePlannedSession(opts: { n: number }): SessionReport {
  const id = asSessionId(opts.n);
  return {
    id,
    status: 'planned',
    absenceAllocations: [],
    downtime: [],
    gameStartDate: '',
    schemaVersion: 2,
    scribeIds: [],
    sessionDate: '', // blank for planned
    source: 'scribe',
    agenda: [],
    gmNotes: '',
  };
}

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
  makeCompletedSession({
    n: 1,
    date: '2025-09-01',
    present: ['char-a', 'char-b'],
  }),
  makeCompletedSession({ n: 2, date: '2025-09-08', present: ['char-a'] }),
  makeCompletedSession({
    n: 3,
    date: '2025-09-15',
    present: ['char-a', 'char-c'],
  }),
  makeCompletedSession({ n: 4, date: '2025-09-22', present: ['char-c'] }),
  makeCompletedSession({ n: 5, date: '2025-09-29', present: ['char-a'] }),
  makePlannedSession({ n: 6 }), // should be ignored by status
];

// --- AP Ledger ---

/**
 * Absence spends recorded so far:
 * - A has already claimed 1 point (e.g., social) -> should zero out their single eligible miss (s4).
 * - B has already claimed 2 points across pillars -> should zero out s2 and s3.
 * - C has not claimed any -> should have 1 unclaimed from s5.
 */
export const LEDGER: ApLedgerEntry[] = [
  {
    kind: 'absence_spend',
    appliedAt: '2025-09-23T10:00:00Z',
    characterId: 'char-a',
    sessionId: asSessionId(4), // attach to the most recent completed at the time of allocation
    notes: 'Claimed one social point for missed session',
    advancementPoints: {
      combat: { delta: 0, reason: 'absence_spend' },
      exploration: { delta: 0, reason: 'absence_spend' },
      social: { delta: 1, reason: 'absence_spend' },
    },
  },
  {
    kind: 'absence_spend',
    appliedAt: '2025-09-16T10:00:00Z',
    characterId: 'char-b',
    sessionId: asSessionId(3),
    notes: 'Covered two missed sessions before retirement',
    advancementPoints: {
      combat: { delta: 1, reason: 'absence_spend' },
      exploration: { delta: 1, reason: 'absence_spend' },
      social: { delta: 0, reason: 'absence_spend' },
    },
  },
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

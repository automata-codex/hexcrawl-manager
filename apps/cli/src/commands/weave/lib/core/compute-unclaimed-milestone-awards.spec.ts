import {
  ApLedgerEntry,
  CharacterData,
  CharacterSchema,
  makeSessionId,
  type SessionReport,
} from '@achm/schemas';
import {
  makeCompletedSessionReport,
  makePlannedSessionReport,
} from '@achm/test-helpers';
import { describe, it, expect } from 'vitest';

import { computeUnclaimedMilestoneAwards } from './compute-unclaimed-milestone-awards';

const ALISTAR: CharacterData = CharacterSchema.parse({
  id: 'alistar',
  fullName: 'Alistar',
  displayName: 'Alistar',
  pronouns: 'he/him',
  playerId: 'player-1',
  species: 'Elf',
  culture: 'Wood Elf',
  class: 'Wizard',
  level: 1,
  advancementPoints: { combat: 0, exploration: 0, social: 0 },
});

const DAEMARIS: CharacterData = CharacterSchema.parse({
  id: 'daemaris',
  fullName: 'Daemaris',
  displayName: 'Daemaris',
  pronouns: 'she/her',
  playerId: 'player-2',
  species: 'Tiefling',
  culture: 'Bandit',
  class: 'Ranger',
  level: 5,
  advancementPoints: { combat: 0, exploration: 0, social: 0 },
});

const ISTAVAN: CharacterData = CharacterSchema.parse({
  id: 'istavan',
  fullName: 'Istavan',
  displayName: 'Istavan',
  pronouns: 'he/him',
  playerId: 'player-3',
  species: 'Human',
  culture: 'Frostfell',
  class: 'Fighter',
  level: 2,
  advancementPoints: { combat: 0, exploration: 0, social: 0 },
});

/** A `session_ap` entry splitting `total` across the three pillars. */
function sessionAp(
  characterId: string,
  sessionN: number,
  splits: { combat?: number; exploration?: number; social?: number },
): ApLedgerEntry {
  return {
    kind: 'session_ap',
    advancementPoints: {
      combat: { delta: splits.combat ?? 0, reason: 'normal' },
      exploration: { delta: splits.exploration ?? 0, reason: 'normal' },
      social: { delta: splits.social ?? 0, reason: 'normal' },
    },
    appliedAt: '2025-10-01T00:00:00.000Z',
    characterId,
    sessionId: makeSessionId(sessionN),
  };
}

/** A `milestone_spend` entry with the given pillar deltas. */
function milestoneSpend(
  characterId: string,
  sessionN: number,
  splits: { combat?: number; exploration?: number; social?: number },
): ApLedgerEntry {
  return {
    kind: 'milestone_spend',
    advancementPoints: {
      combat: { delta: splits.combat ?? 0, reason: 'normal' },
      exploration: { delta: splits.exploration ?? 0, reason: 'normal' },
      social: { delta: splits.social ?? 0, reason: 'normal' },
    },
    appliedAt: '2025-10-01T00:00:00.000Z',
    characterId,
    sessionId: makeSessionId(sessionN),
  };
}

describe('computeUnclaimedMilestoneAwards', () => {
  it('computes eligible AP as the per-session top-up from session AP', () => {
    const sessions: SessionReport[] = [
      makeCompletedSessionReport({
        n: 1,
        date: '2025-09-01',
        present: ['alistar', 'daemaris', 'istavan'],
      }),
    ];
    const milestoneCounts = new Map<string, number>([['session-0001', 1]]);
    const ledger: ApLedgerEntry[] = [
      sessionAp('alistar', 1, { combat: 2 }), // total 2 -> topUp 1
      sessionAp('daemaris', 1, { combat: 1 }), // total 1 -> topUp 2
      sessionAp('istavan', 1, {}), // total 0 -> topUp 3
    ];

    const rows = computeUnclaimedMilestoneAwards(
      sessions,
      [ALISTAR, DAEMARIS, ISTAVAN],
      ledger,
      milestoneCounts,
    );
    const byChar = Object.fromEntries(rows.map((r) => [r.characterId, r]));
    expect(byChar.alistar.eligibleAp).toBe(1);
    expect(byChar.daemaris.eligibleAp).toBe(2);
    expect(byChar.istavan.eligibleAp).toBe(3);
  });

  it('applies a per-session cap, not per-event (multi-milestone sessions do not double AP)', () => {
    const sessions: SessionReport[] = [
      makeCompletedSessionReport({
        n: 1,
        date: '2025-09-01',
        present: ['alistar'],
      }),
    ];
    // Two milestone events in one session.
    const milestoneCounts = new Map<string, number>([['session-0001', 2]]);
    const ledger: ApLedgerEntry[] = [
      sessionAp('alistar', 1, { combat: 1 }), // total 1 -> topUp 2
    ];

    const rows = computeUnclaimedMilestoneAwards(
      sessions,
      [ALISTAR],
      ledger,
      milestoneCounts,
    );
    // One top-up to the cap (2), NOT two (would be 4).
    expect(rows[0].eligibleAp).toBe(2);
  });

  it('defaults eligible AP to the full cap when the session has no session_ap yet', () => {
    const sessions: SessionReport[] = [
      makeCompletedSessionReport({
        n: 1,
        date: '2025-09-01',
        present: ['alistar'],
      }),
    ];
    const milestoneCounts = new Map<string, number>([['session-0001', 1]]);
    // No session_ap entry for alistar -> top-up not computable -> full cap.
    const ledger: ApLedgerEntry[] = [];

    const rows = computeUnclaimedMilestoneAwards(
      sessions,
      [ALISTAR],
      ledger,
      milestoneCounts,
    );
    expect(rows[0].eligibleAp).toBe(3);
  });

  it('yields eligible AP 0 when session AP already meets or exceeds the cap (grandfather edge)', () => {
    const sessions: SessionReport[] = [
      makeCompletedSessionReport({
        n: 1,
        date: '2025-09-01',
        present: ['alistar', 'daemaris'],
      }),
    ];
    const milestoneCounts = new Map<string, number>([['session-0001', 1]]);
    const ledger: ApLedgerEntry[] = [
      sessionAp('alistar', 1, { combat: 3 }), // total 3 -> topUp 0
      sessionAp('daemaris', 1, { combat: 2, exploration: 2 }), // total 4 -> floor 0
    ];

    const rows = computeUnclaimedMilestoneAwards(
      sessions,
      [ALISTAR, DAEMARIS],
      ledger,
      milestoneCounts,
    );
    const byChar = Object.fromEntries(rows.map((r) => [r.characterId, r]));
    expect(byChar.alistar.eligibleAp).toBe(0);
    expect(byChar.daemaris.eligibleAp).toBe(0);
  });

  it('computes claimed AP as the sum of milestone_spend pillar deltas (not a count)', () => {
    const sessions: SessionReport[] = [
      makeCompletedSessionReport({
        n: 1,
        date: '2025-09-01',
        present: ['alistar'],
      }),
    ];
    const milestoneCounts = new Map<string, number>([['session-0001', 1]]);
    const ledger: ApLedgerEntry[] = [
      sessionAp('alistar', 1, { combat: 1 }), // total 1 -> eligible 2
      milestoneSpend('alistar', 1, { combat: 1, exploration: 1, social: 0 }),
    ];

    const rows = computeUnclaimedMilestoneAwards(
      sessions,
      [ALISTAR],
      ledger,
      milestoneCounts,
    );
    // Sum of deltas (1+1+0) = 2, not 1 (the entry count).
    expect(rows[0].claimedAp).toBe(2);
  });

  it('floors unclaimed at 0 and nets to 0 for a fully reconciled session', () => {
    const sessions: SessionReport[] = [
      makeCompletedSessionReport({
        n: 1,
        date: '2025-09-01',
        present: ['alistar', 'daemaris'],
      }),
    ];
    const milestoneCounts = new Map<string, number>([['session-0001', 1]]);
    const ledger: ApLedgerEntry[] = [
      // alistar: top-up 2, claimed exactly 2 -> unclaimed 0
      sessionAp('alistar', 1, { combat: 1 }),
      milestoneSpend('alistar', 1, { combat: 2 }),
      // daemaris: top-up 1, but claimed 3 (data drift) -> unclaimed floored to 0
      sessionAp('daemaris', 1, { combat: 2 }),
      milestoneSpend('daemaris', 1, { combat: 3 }),
    ];

    const rows = computeUnclaimedMilestoneAwards(
      sessions,
      [ALISTAR, DAEMARIS],
      ledger,
      milestoneCounts,
    );
    const byChar = Object.fromEntries(rows.map((r) => [r.characterId, r]));
    expect(byChar.alistar).toMatchObject({
      eligibleAp: 2,
      claimedAp: 2,
      unclaimedAp: 0,
    });
    expect(byChar.daemaris).toMatchObject({
      eligibleAp: 1,
      claimedAp: 3,
      unclaimedAp: 0,
    });
  });

  it('contributes 0 AP for non-attendees', () => {
    const sessions: SessionReport[] = [
      makeCompletedSessionReport({
        n: 1,
        date: '2025-09-01',
        present: ['alistar', 'daemaris'], // istavan absent
      }),
    ];
    const milestoneCounts = new Map<string, number>([['session-0001', 1]]);
    const ledger: ApLedgerEntry[] = [sessionAp('alistar', 1, { combat: 2 })];

    const rows = computeUnclaimedMilestoneAwards(
      sessions,
      [ALISTAR, DAEMARIS, ISTAVAN],
      ledger,
      milestoneCounts,
    );
    const byChar = Object.fromEntries(rows.map((r) => [r.characterId, r]));
    expect(byChar.alistar).toMatchObject({
      eligibleAp: 1,
      claimedAp: 0,
      unclaimedAp: 1,
    });
    // daemaris attended but has no session_ap -> defaults to cap
    expect(byChar.daemaris).toMatchObject({
      eligibleAp: 3,
      claimedAp: 0,
      unclaimedAp: 3,
    });
    // istavan absent -> 0
    expect(byChar.istavan).toMatchObject({
      eligibleAp: 0,
      claimedAp: 0,
      unclaimedAp: 0,
    });
  });

  it('ignores planned sessions and completed sessions with no milestone events', () => {
    const sessions: SessionReport[] = [
      makeCompletedSessionReport({
        n: 1,
        date: '2025-09-01',
        present: ['alistar'],
      }),
      makePlannedSessionReport({ n: 2 }),
    ];
    // s1 has no milestone, s2 is planned
    const milestoneCounts = new Map<string, number>();
    const ledger: ApLedgerEntry[] = [sessionAp('alistar', 1, { combat: 0 })];

    const rows = computeUnclaimedMilestoneAwards(
      sessions,
      [ALISTAR],
      ledger,
      milestoneCounts,
    );
    expect(rows[0]).toMatchObject({
      eligibleAp: 0,
      claimedAp: 0,
      unclaimedAp: 0,
    });
  });

  it('accumulates eligible AP across multiple milestone sessions', () => {
    const sessions: SessionReport[] = [
      makeCompletedSessionReport({
        n: 1,
        date: '2025-09-01',
        present: ['alistar'],
      }),
      makeCompletedSessionReport({
        n: 2,
        date: '2025-09-08',
        present: ['alistar', 'daemaris'],
      }),
      makeCompletedSessionReport({
        n: 3,
        date: '2025-09-15',
        present: ['alistar', 'daemaris'],
      }),
    ];
    const milestoneCounts = new Map<string, number>([
      ['session-0001', 1],
      // session-0002 has no milestone
      ['session-0003', 1],
    ]);
    const ledger: ApLedgerEntry[] = [
      sessionAp('alistar', 1, { combat: 2 }), // topUp 1
      sessionAp('alistar', 3, { combat: 1 }), // topUp 2
      sessionAp('daemaris', 3, { combat: 0 }), // topUp 3
    ];

    const rows = computeUnclaimedMilestoneAwards(
      sessions,
      [ALISTAR, DAEMARIS],
      ledger,
      milestoneCounts,
    );
    const byChar = Object.fromEntries(rows.map((r) => [r.characterId, r]));
    // alistar: s1 (1) + s3 (2) = 3
    expect(byChar.alistar.eligibleAp).toBe(3);
    // daemaris: absent s1, present s3 (3) = 3
    expect(byChar.daemaris.eligibleAp).toBe(3);
  });
});

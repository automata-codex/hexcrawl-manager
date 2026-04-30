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

function milestoneSpend(
  characterId: string,
  sessionN: number,
): ApLedgerEntry {
  return {
    kind: 'milestone_spend',
    advancementPoints: {
      combat: { delta: 0, reason: 'normal' },
      exploration: { delta: 0, reason: 'normal' },
      social: { delta: 0, reason: 'normal' },
    },
    appliedAt: '2025-10-01T00:00:00.000Z',
    characterId,
    sessionId: makeSessionId(sessionN),
  };
}

describe('computeUnclaimedMilestoneAwards', () => {
  it('counts a milestone for present attendees, ignores non-attendees', () => {
    const sessions: SessionReport[] = [
      makeCompletedSessionReport({
        n: 1,
        date: '2025-09-01',
        present: ['alistar', 'daemaris'], // istavan absent
      }),
    ];
    const milestoneCounts = new Map<string, number>([['session-0001', 1]]);

    const rows = computeUnclaimedMilestoneAwards(
      sessions,
      [ALISTAR, DAEMARIS, ISTAVAN],
      [],
      milestoneCounts,
    );

    const byChar = Object.fromEntries(rows.map((r) => [r.characterId, r]));
    expect(byChar.alistar).toMatchObject({ eligible: 1, claimed: 0, unclaimed: 1 });
    expect(byChar.daemaris).toMatchObject({ eligible: 1, claimed: 0, unclaimed: 1 });
    expect(byChar.istavan).toMatchObject({ eligible: 0, claimed: 0, unclaimed: 0 });
  });

  it('subtracts claimed milestone_spend entries from eligibility', () => {
    const sessions: SessionReport[] = [
      makeCompletedSessionReport({
        n: 1,
        date: '2025-09-01',
        present: ['alistar', 'daemaris'],
      }),
    ];
    const milestoneCounts = new Map<string, number>([['session-0001', 1]]);
    const ledger: ApLedgerEntry[] = [milestoneSpend('alistar', 1)];

    const rows = computeUnclaimedMilestoneAwards(
      sessions,
      [ALISTAR, DAEMARIS],
      ledger,
      milestoneCounts,
    );
    const byChar = Object.fromEntries(rows.map((r) => [r.characterId, r]));
    expect(byChar.alistar).toMatchObject({ eligible: 1, claimed: 1, unclaimed: 0 });
    expect(byChar.daemaris).toMatchObject({ eligible: 1, claimed: 0, unclaimed: 1 });
  });

  it('accumulates eligibility across multiple milestone sessions', () => {
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
      ['session-0003', 2], // two milestones in one session
    ]);

    const rows = computeUnclaimedMilestoneAwards(
      sessions,
      [ALISTAR, DAEMARIS],
      [],
      milestoneCounts,
    );
    const byChar = Object.fromEntries(rows.map((r) => [r.characterId, r]));
    // alistar: present at s1 (1) + s3 (2) = 3
    expect(byChar.alistar.eligible).toBe(3);
    // daemaris: absent from s1, present at s3 (2) = 2
    expect(byChar.daemaris.eligible).toBe(2);
  });

  it('ignores planned sessions and sessions with no milestone events', () => {
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

    const rows = computeUnclaimedMilestoneAwards(
      sessions,
      [ALISTAR],
      [],
      milestoneCounts,
    );
    expect(rows[0]).toMatchObject({ eligible: 0, claimed: 0, unclaimed: 0 });
  });

  it('returns 0 for characters who attended but no milestones occurred during their tenure', () => {
    const sessions: SessionReport[] = [
      makeCompletedSessionReport({
        n: 1,
        date: '2025-09-01',
        present: ['alistar'],
      }),
    ];
    const milestoneCounts = new Map<string, number>();

    const rows = computeUnclaimedMilestoneAwards(
      sessions,
      [ALISTAR, DAEMARIS],
      [],
      milestoneCounts,
    );
    const byChar = Object.fromEntries(rows.map((r) => [r.characterId, r]));
    expect(byChar.alistar.eligible).toBe(0);
    expect(byChar.daemaris.eligible).toBe(0);
  });

  it('floors unclaimed at 0 when claimed exceeds eligibility (data drift defense)', () => {
    const sessions: SessionReport[] = [
      makeCompletedSessionReport({
        n: 1,
        date: '2025-09-01',
        present: ['alistar'],
      }),
    ];
    const milestoneCounts = new Map<string, number>([['session-0001', 1]]);
    // Two milestone_spend entries for one milestone — shouldn't happen in practice
    // but the column should never go negative.
    const ledger: ApLedgerEntry[] = [
      milestoneSpend('alistar', 1),
      milestoneSpend('alistar', 2),
    ];

    const rows = computeUnclaimedMilestoneAwards(
      sessions,
      [ALISTAR],
      ledger,
      milestoneCounts,
    );
    expect(rows[0]).toMatchObject({ eligible: 1, claimed: 2, unclaimed: 0 });
  });
});

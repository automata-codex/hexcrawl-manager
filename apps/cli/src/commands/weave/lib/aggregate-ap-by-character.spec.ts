import { padSessionNum } from '@skyreach/core';
import { ApLedgerEntry, SessionId } from '@skyreach/schemas';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import { aggregateApByCharacter } from './aggregate-ap-by-character';

const asSessionId = (n: number): z.infer<typeof SessionId> =>
  `session-${padSessionNum(n)}` as const;

/**
 * Absence spends recorded so far:
 * - A has already claimed 1 point (e.g., social) -> should zero out their single eligible miss (s4).
 * - B has already claimed 2 points across pillars -> should zero out s2 and s3.
 * - C has not claimed any -> should have 1 unclaimed from s5.
 */
export const LEDGER: ApLedgerEntry[] = [
  {
    kind: 'session_ap',
    appliedAt: '2025-09-23T10:00:00Z',
    characterId: 'char-a',
    sessionId: asSessionId(4), // attach to the most recent completed at the time of allocation
    advancementPoints: {
      combat: { delta: 0, reason: 'normal' },
      exploration: { delta: 0, reason: 'normal' },
      social: { delta: 1, reason: 'normal' },
    },
  },
  {
    kind: 'session_ap',
    appliedAt: '2025-09-16T10:00:00Z',
    characterId: 'char-b',
    sessionId: asSessionId(3),
    advancementPoints: {
      combat: { delta: 1, reason: 'normal' },
      exploration: { delta: 1, reason: 'normal' },
      social: { delta: 0, reason: 'normal' },
    },
  },
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

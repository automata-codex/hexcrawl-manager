import { ap, finalizeLog } from '@skyreach/test-helpers';
import { describe, it, expect } from 'vitest';

import { computeApForSession } from './compute-ap-for-session';

import type { ScribeEvent } from '@skyreach/schemas';

describe('Function `computeApForSession`', () => {
  const party = ['alistar', 'istavan', 'daemaris'];
  const apEvents: ScribeEvent[] = finalizeLog([
    ap('combat', 1, party, 'R14', 'Defeated goblins'),
    ap('exploration', 2, party, 'S15', 'Found a hidden dungeon'),
    ap('social', 1, party, 'Q14', 'Talked to the alseid'),
    ap('exploration', 1, party, 'Q13', 'Entered a new region'),
    ap('combat', 1, party, 'R16', 'Fought some baddies'),
    ap('exploration', 1, party, 'S14', 'Found a hidden temple'),
    ap('social', 1, party, 'S14', 'Chatted with village elder'),
  ]);
  const characterLevels: Record<string, number> = {
    alistar: 5,
    istavan: 3,
    daemaris: 2,
  };

  describe('for session 19 or earlier', () => {
    it('correctly computes AP for a session', () => {
      const { reportAdvancementPoints, ledgerResults } = computeApForSession(
        apEvents,
        characterLevels,
        18,
      );

      expect(reportAdvancementPoints).toEqual({
        combat: { number: 1, maxTier: 1 },
        exploration: { number: 1, maxTier: 2 },
        social: { number: 1, maxTier: 1 },
      });

      expect(ledgerResults).toEqual({
        alistar: {
          combat: { delta: 1, reason: 'grandfathered' },
          exploration: { delta: 1, reason: 'normal' },
          social: { delta: 1, reason: 'grandfathered' },
        },
        istavan: {
          combat: { delta: 1, reason: 'normal' },
          exploration: { delta: 1, reason: 'normal' },
          social: { delta: 1, reason: 'normal' },
        },
        daemaris: {
          combat: { delta: 1, reason: 'normal' },
          exploration: { delta: 1, reason: 'normal' },
          social: { delta: 1, reason: 'normal' },
        },
      });
    });
  });
  describe('for session 20 or later', () => {
    it('correctly computes AP for a session', () => {
      const { reportAdvancementPoints, ledgerResults } = computeApForSession(
        apEvents,
        characterLevels,
        27,
      );

      expect(reportAdvancementPoints).toEqual({
        combat: { number: 1, maxTier: 1 },
        exploration: { number: 1, maxTier: 2 },
        social: { number: 1, maxTier: 1 },
      });

      expect(ledgerResults).toEqual({
        alistar: {
          combat: { delta: 0, reason: 'cap' },
          exploration: { delta: 1, reason: 'normal' },
          social: { delta: 0, reason: 'cap' },
        },
        istavan: {
          combat: { delta: 1, reason: 'normal' },
          exploration: { delta: 1, reason: 'normal' },
          social: { delta: 1, reason: 'normal' },
        },
        daemaris: {
          combat: { delta: 1, reason: 'normal' },
          exploration: { delta: 1, reason: 'normal' },
          social: { delta: 1, reason: 'normal' },
        },
      });
    });
  });
});

import { describe, it, expect } from 'vitest';

import { computeApForSession } from './compute-ap-for-session';

import type { ScribeEvent } from '@skyreach/schemas';

describe('Function `computeApForSession`', () => {
  const apEvents: ScribeEvent[] = [
    {
      seq: 5,
      ts: '2024-01-01T19:00:00Z',
      kind: 'advancement_point',
      payload: {
        pillar: 'combat',
        tier: 1,
        note: 'Defeated goblins',
        at: { hex: '0101', party: ['alistar', 'istavan', 'daemaris'] },
      },
    },
    {
      seq: 18,
      ts: '2024-01-01T19:10:00Z',
      kind: 'advancement_point',
      payload: {
        pillar: 'exploration',
        tier: 2,
        note: 'Found a hidden dungeon',
        at: { hex: '0101', party: ['alistar', 'istavan', 'daemaris'] },
      },
    },
    {
      seq: 22,
      ts: '2024-01-01T19:11:00Z',
      kind: 'advancement_point',
      payload: {
        pillar: 'social',
        tier: 1,
        note: 'Talked to the alseid',
        at: { hex: '0101', party: ['alistar', 'istavan', 'daemaris'] },
      },
    },
    {
      seq: 27,
      ts: '2024-01-01T19:12:00Z',
      kind: 'advancement_point',
      payload: {
        pillar: 'exploration',
        tier: 1,
        note: 'Entered a new region',
        at: { hex: '0101', party: ['alistar', 'istavan', 'daemaris'] },
      },
    },
    {
      seq: 33,
      ts: '2024-01-01T19:13:00Z',
      kind: 'advancement_point',
      payload: {
        pillar: 'combat',
        tier: 1,
        note: 'Fought some baddies',
        at: { hex: '0101', party: ['alistar', 'istavan', 'daemaris'] },
      },
    },
    {
      seq: 37,
      ts: '2024-01-01T19:14:00Z',
      kind: 'advancement_point',
      payload: {
        pillar: 'exploration',
        tier: 1,
        note: 'Found a hidden temple',
        at: { hex: '0101', party: ['alistar', 'istavan', 'daemaris'] },
      },
    },
    {
      seq: 42,
      ts: '2024-01-01T19:15:00Z',
      kind: 'advancement_point',
      payload: {
        pillar: 'social',
        tier: 1,
        note: 'Chatted with village elder',
        at: { hex: '0101', party: ['alistar', 'istavan', 'daemaris'] },
      },
    },
  ];

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

import { makeSessionId } from '@skyreach/schemas';
import {
  compileLog,
  dayEnd,
  dayStart,
  move,
  sessionEnd,
  sessionStart,
} from '@skyreach/test-helpers';
import { describe, it, expect } from 'vitest';

import { buildSeasonBlocks } from './session';

describe('Session Service', () => {
  describe('Function `buildSeasonBlocks`', () => {
    it('splits events into blocks by seasonId from day_start events', () => {
      const sessionId = makeSessionId(27);
      const events = compileLog([
        sessionStart(sessionId, 'R14', '2025-10-15'),
        dayStart({ year: 1511, month: 'Lucidus', day: 30 }),
        move('R14', 'R15'),
        dayEnd(0, 0),
        dayStart({ year: 1511, month: 'Lucidus', day: 31 }),
        move('R15', 'R16'),
        dayEnd(0, 0),
        dayStart({ year: 1511, month: 'Fructara', day: 1 }),
        move('R16', 'R17'),
        dayEnd(0, 0),
        dayStart({ year: 1511, month: 'Fructara', day: 2 }),
        move('R17', 'R18'),
        dayEnd(0, 0),
        sessionEnd(sessionId),
      ]);
      const expandedEvents = events.map((e, i) => ({ ...e, _origIdx: i }));

      const result = buildSeasonBlocks(expandedEvents);
      expect(result.blocks.length).toBe(2);
      expect(result.blocks[0].seasonId).toBe('1511-summer');
      expect(result.blocks[1].seasonId).toBe('1511-autumn');
    });
  });
});

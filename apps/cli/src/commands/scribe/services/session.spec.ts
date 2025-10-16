import { TrailEventSchema, makeSessionId } from '@skyreach/schemas';
import {
  compileLog,
  dayEnd,
  dayStart,
  move,
  sessionEnd,
  sessionStart,
  trail,
} from '@skyreach/test-helpers';
import { describe, it, expect } from 'vitest';

import {
  buildSeasonBlocks,
  normalizeTrailEdges,
  sortAndValidateEvents,
  synthesizeLifecycleEvents,
} from './session';

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

  describe('Function `normalizeTrailEdges`', () => {
    it('swaps from/to if from is after to by hexSort', () => {
      const events = compileLog([trail('b2', 'a1')]);
      const result = normalizeTrailEdges(events);

      const trailEvent = TrailEventSchema.parse(result[0]);
      expect(trailEvent.payload.from).toBe('A1');
      expect(trailEvent.payload.to).toBe('B2');
    });
  });

  describe('Function `sortAndValidateEvents`', () => {
    it('sorts events by timestamp and sequence', () => {
      const startMs = new Date('2025-10-01T00:00:00Z').getTime();
      const stepMs = 60_000;

      const sessionId = makeSessionId(27);
      const events = compileLog([
        dayEnd(0, 0),
        dayStart({ year: 1511, month: 'Lucidus', day: 31 }),
        sessionStart(sessionId, 'R14', '2025-10-15'),
        move('R14', 'R15'),
        dayStart({ year: 1511, month: 'Fructara', day: 1 }),
        move('R15', 'R16'),
        dayEnd(0, 0),
        sessionEnd(sessionId),
      ]);
      // noinspection PointlessArithmeticExpressionJS
      events[2].ts = new Date(startMs + 0 * stepMs).toISOString(); // sessionStart
      // noinspection PointlessArithmeticExpressionJS
      events[1].ts = new Date(startMs + 1 * stepMs).toISOString(); // dayStart
      events[3].ts = new Date(startMs + 2 * stepMs).toISOString(); // move
      events[0].ts = new Date(startMs + 3 * stepMs).toISOString(); // dayEnd

      const result = sortAndValidateEvents(events); // Events are sorted by timestamp but seq is **not** renumbered
      expect(result.sortedEvents[0].seq).toBe(3);
      expect(result.sortedEvents[0]._origIdx).toBe(2);
      expect(result.sortedEvents[1].seq).toBe(2);
      expect(result.sortedEvents[1]._origIdx).toBe(1);
    });
  });

  describe('Function `synthesizeLifecycleEvents`', () => {
    it('inserts session_end if missing at block end', () => {
      const sessionDate = '2025-10-15';
      const sessionId = makeSessionId(27);
      const events = compileLog([
        sessionStart(sessionId, 'R14', sessionDate),
        dayStart({ year: 1511, month: 'Lucidus', day: 31 }),
        move('R14', 'R15'),
        dayEnd(0, 0),
      ]).map((e, i) => ({ ...e, _origIdx: i }));

      const blocks = [{ seasonId: '1511-summer', events }];
      const result = synthesizeLifecycleEvents(
        blocks,
        events,
        sessionId,
        sessionDate,
      );
      expect(
        result.finalizedBlocks[0].events.some((e) => e.kind === 'session_end'),
      ).toBe(true);
    });
  });
});

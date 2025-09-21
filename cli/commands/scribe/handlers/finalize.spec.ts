import { describe, it, expect } from 'vitest';
import {
  eventsOf,
  findSessionFiles,
  readJsonl,
  runScribe,
  withTempRepo,
} from '../../shared-lib';
import { REPO_PATHS } from '../../shared-lib/constants';
import type { CanonicalDate } from '../types.ts';

describe('scribe finalize', () => {
  it('partitions session events correctly and writes output files', async () => {
    await withTempRepo('scribe-finalize-happy', { initGit: false }, async (repo) => {
      const commands = [
        'start p13',
        'day start 30 hib 1511',
        'move p14',
        'rest',
        'day start',
        'rest',
        'day start',
        'rest',
        'day start',
        'move p15',
        'rest',
        'finalize'
      ];
      const { exitCode, stderr } = await runScribe(commands, { repo });

      expect(exitCode).toBe(0);
      expect(stderr).toBe('');

      // Gather all events from all session files
      const files = findSessionFiles(REPO_PATHS.SESSIONS());
      const allEvents = files.flatMap(readJsonl);

      // Find all unique season IDs from day_start events
      const uniqueSeasons = new Set(
        eventsOf(allEvents, 'day_start')
          .map(e => {
            const calendarDate = e.payload.calendarDate as CanonicalDate;
            return `${calendarDate.year}-${String(e.payload.season).toLowerCase()}`;
          })
      );
      expect(files.length).toEqual(uniqueSeasons.size); // Should be one session file per unique season

      // Should contain all moves
      const moves = allEvents.filter(e => e.kind === 'move');
      expect(moves.length).toBe(2);
    });
  });
});

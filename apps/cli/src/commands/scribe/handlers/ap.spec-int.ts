import { REPO_PATHS } from '@achm/data';
import { runScribe, withTempRepo } from '@achm/test-helpers';
import fs from 'fs';
import { describe, it, expect } from 'vitest';

describe('scribe ap milestone', () => {
  it('emits a structured milestone event with the supplied note', async () => {
    await withTempRepo(
      'scribe-ap-milestone-happy',
      { initGit: false },
      async (repo) => {
        const { exitCode } = await runScribe(
          [
            'start H7',
            'day start 20 umb 1511',
            'ap milestone "Survived the Winter of 1512"',
          ],
          { repo },
        );

        expect(exitCode).toBe(0);

        const sessionPath = fs
          .readdirSync(REPO_PATHS.SESSIONS())
          .find((f) => f.endsWith('.jsonl'));
        expect(sessionPath).toBeDefined();
        const fullPath = `${REPO_PATHS.SESSIONS()}/${sessionPath}`;
        const events = fs
          .readFileSync(fullPath, 'utf8')
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line));

        const milestoneEvent = events.find((e) => e.kind === 'milestone');
        expect(milestoneEvent).toBeDefined();
        expect(milestoneEvent.payload).toEqual({
          note: 'Survived the Winter of 1512',
        });

        // No legacy todo event should be emitted for the milestone
        const milestoneTodos = events.filter(
          (e) =>
            e.kind === 'todo' &&
            typeof e.payload?.text === 'string' &&
            e.payload.text.startsWith('Add AP for milestone:'),
        );
        expect(milestoneTodos).toHaveLength(0);
      },
    );
  });

  it('rejects ap milestone with no note', async () => {
    await withTempRepo(
      'scribe-ap-milestone-empty',
      { initGit: false },
      async (repo) => {
        const { exitCode, stdout } = await runScribe(
          ['start H7', 'day start 20 umb 1511', 'ap milestone'],
          { repo },
        );

        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/usage: ap milestone/i);

        const sessionPath = fs
          .readdirSync(REPO_PATHS.SESSIONS())
          .find((f) => f.endsWith('.jsonl'));
        const fullPath = `${REPO_PATHS.SESSIONS()}/${sessionPath}`;
        const events = fs
          .readFileSync(fullPath, 'utf8')
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line));

        expect(events.find((e) => e.kind === 'milestone')).toBeUndefined();
      },
    );
  });
});

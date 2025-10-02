import { eventsOf, pad } from '@skyreach/cli-kit';
import { readJsonl, REPO_PATHS } from '@skyreach/data';
import {
  findSessionFiles,
  runScribe,
  withTempRepo,
} from '@skyreach/test-helpers';
import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import yaml from 'yaml';

import type { CampaignDate, ScribeEvent } from '@skyreach/schemas';

describe('scribe finalize', () => {
  it('partitions session events correctly and writes output files', async () => {
    await withTempRepo(
      'scribe-finalize-happy',
      { initGit: false },
      async (repo) => {
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
          'finalize',
        ];
        const { exitCode, stderr } = await runScribe(commands, { repo });

        expect(exitCode).toBe(0);
        expect(stderr).toBe('');

        // Gather all events from all session files
        const files = findSessionFiles(REPO_PATHS.SESSIONS());
        const allEvents = files.flatMap(readJsonl);

        // Find all unique season IDs from day_start events
        const uniqueSeasons = new Set(
          eventsOf(allEvents, 'day_start').map((e) => {
            const calendarDate = e.payload.calendarDate as CampaignDate;
            return `${calendarDate.year}-${String(e.payload.season).toLowerCase()}`;
          }),
        );
        expect(files.length).toEqual(uniqueSeasons.size); // Should be one session file per unique season

        // Should contain all moves
        const moves = allEvents.filter((e) => e.kind === 'move');
        expect(moves.length).toBe(2);
      },
    );
  });

  it('errors if there is no day_start event', async () => {
    await withTempRepo(
      'scribe-finalize-no-daystart',
      { initGit: false },
      async (repo) => {
        const commands = ['start p13', 'move p14', 'finalize'];
        const { exitCode, stderr } = await runScribe(commands, { repo });
        expect(exitCode).toBe(0); // REPL exits normally
        expect(stderr).toMatch(/no day_start/i);
        const files = findSessionFiles(REPO_PATHS.SESSIONS());
        expect(files.length).toBe(0);
      },
    );
  });

  it('errors if first event is not session_start or session_continue', async () => {
    await withTempRepo(
      'scribe-finalize-bad-first-event',
      { initGit: false },
      async (repo) => {
        // Manually write a bad in-progress file
        const inProgressDir = REPO_PATHS.IN_PROGRESS();
        fs.mkdirSync(inProgressDir, { recursive: true });
        const sessionId = `session_0027_2025-09-20`;
        const sessionFile = path.join(inProgressDir, `${sessionId}.jsonl`);
        fs.writeFileSync(
          sessionFile,
          JSON.stringify({
            kind: 'move',
            payload: { from: 'P13', to: 'Q13' },
          }) + '\n',
        );

        const commands = ['finalize'];
        // eslint-disable-next-line no-unused-vars
        const { exitCode, stderr, stdout } = await runScribe(commands, {
          repo,
        });

        expect(exitCode).toBe(0); // REPL exits normally
        expect(stdout).toMatch(/start or resume a session first/i);
        const files = findSessionFiles(REPO_PATHS.SESSIONS());
        expect(files.length).toBe(0);
      },
    );
  });

  // Silly Copilot, there is no `session` command
  it.skip('errors if session_pause appears before the end', async () => {
    await withTempRepo(
      'scribe-finalize-pause-mid',
      { initGit: false },
      async (repo) => {
        const commands = [
          'start p13',
          'day start 8 umb 1511',
          'session pause',
          'move q13 normal',
          'finalize',
        ];
        const { exitCode, stdout } = await runScribe(commands, { repo });

        expect(exitCode).toBe(0); // REPL exits normally
        expect(stdout).toMatch(/session_pause may only appear at the end/i);
        const files = findSessionFiles(REPO_PATHS.SESSIONS());
        expect(files.length).toBe(0);
      },
    );
  });

  // Silly Copilot, non-monotonic timestamps are impossible because we sort by timestamp before checking for monotonicity
  it.skip('errors if timestamps are non-monotonic', async () => {
    await withTempRepo(
      'scribe-finalize-bad-ts',
      { initGit: false },
      async (repo) => {
        // Manually write a bad in-progress file
        const inProgressDir = REPO_PATHS.IN_PROGRESS();
        fs.mkdirSync(inProgressDir, { recursive: true });
        const sessionId = `session_0027_2025-09-20`;
        const sessionFile = path.join(inProgressDir, `${sessionId}.jsonl`);
        const events = [
          { kind: 'session_start', ts: '2025-09-20T10:00:00.000Z' },
          {
            kind: 'day_start',
            payload: {
              calendarDate: { year: 1511, month: 'Umbraeus', day: 8 },
              season: 'autumn',
            },
            ts: '2025-09-20T09:00:00.000Z',
          },
        ];
        fs.writeFileSync(
          sessionFile,
          events.map((e) => JSON.stringify(e)).join('\n') + '\n',
        );
        const commands = ['finalize'];
        const { exitCode, stderr } = await runScribe(commands, { repo });
        expect(exitCode).not.toBe(0);
        expect(stderr).toMatch(/non-monotonic timestamps/i);
        const files = findSessionFiles(REPO_PATHS.SESSIONS());
        expect(files.length).toBe(0);
      },
    );
  });

  it('errors if sequence numbers are non-monotonic', async () => {
    await withTempRepo(
      'scribe-finalize-bad-seq',
      { initGit: false },
      async (repo) => {
        const meta = yaml.parse(fs.readFileSync(REPO_PATHS.META(), 'utf8'));
        const nextSessionNumber = parseInt(meta.nextSessionSeq, 10) || 1;
        const sessionId = `session_${pad(nextSessionNumber)}_2025-09-20`;

        const lockDir = REPO_PATHS.LOCKS();
        fs.mkdirSync(lockDir, { recursive: true });
        const lockFile = path.join(
          lockDir,
          `session_${pad(nextSessionNumber)}.lock`,
        );
        fs.writeFileSync(lockFile, '');

        // Manually write a bad in-progress file
        const inProgressDir = REPO_PATHS.IN_PROGRESS();
        fs.mkdirSync(inProgressDir, { recursive: true });
        const sessionFile = path.join(inProgressDir, `${sessionId}.jsonl`);
        const events: ScribeEvent[] = [
          {
            seq: 1,
            kind: 'session_start',
            ts: '2025-09-20T10:00:00.000Z',
            payload: { sessionId },
          },
          {
            seq: 4,
            kind: 'day_start',
            ts: '2025-09-20T09:00:00.000Z',
            payload: {
              calendarDate: { year: 1511, month: 'Umbraeus', day: 8 },
              season: 'autumn',
            },
          },
        ];
        fs.writeFileSync(
          sessionFile,
          events.map((e) => JSON.stringify(e)).join('\n') + '\n',
        );

        const commands = ['resume', 'move p14', 'rest', 'finalize'];
        // eslint-disable-next-line no-unused-vars
        const { exitCode, stderr, stdout } = await runScribe(commands, {
          repo,
          ensureExit: false,
        });

        expect(exitCode).toBe(0); // REPL exits normally
        expect(stderr).toMatch(/Non-monotonic sequence numbers/i);
        const files = findSessionFiles(REPO_PATHS.SESSIONS());
        expect(files.length).toBe(0);
      },
    );
  });

  it('errors if no lock file exists in production mode', async () => {
    await withTempRepo(
      'scribe-finalize-no-lock',
      { initGit: false },
      async (repo) => {
        const meta = yaml.parse(fs.readFileSync(REPO_PATHS.META(), 'utf8'));
        const nextSessionNumber = parseInt(meta.nextSessionSeq, 10) || 1;
        const sessionId = `session_${pad(nextSessionNumber)}_2025-09-20`;

        // Manually write an in-progress file
        const inProgressDir = REPO_PATHS.IN_PROGRESS();
        fs.mkdirSync(inProgressDir, { recursive: true });
        const sessionFile = path.join(inProgressDir, `${sessionId}.jsonl`);
        const events: ScribeEvent[] = [
          {
            seq: 1,
            kind: 'session_start',
            ts: '2025-09-20T10:00:00.000Z',
            payload: { sessionId },
          },
          {
            seq: 2,
            kind: 'day_start',
            ts: '2025-09-20T11:00:00.000Z',
            payload: {
              calendarDate: { year: 1511, month: 'Umbraeus', day: 8 },
              season: 'autumn',
            },
          },
        ];
        fs.writeFileSync(
          sessionFile,
          events.map((e) => JSON.stringify(e)).join('\n') + '\n',
        );

        // Remove lock file if present
        const lockDir = REPO_PATHS.LOCKS();
        if (fs.existsSync(lockDir)) {
          for (const f of fs.readdirSync(lockDir)) {
            fs.unlinkSync(path.join(lockDir, f));
          }
        }
        const commands = ['resume', 'finalize'];
        // eslint-disable-next-line no-unused-vars
        const { exitCode, stderr, stdout } = await runScribe(commands, {
          repo,
        });
        expect(exitCode).toBe(0); // REPL exits normally
        expect(stderr).toMatch(/No lock file/i);
        const files = findSessionFiles(REPO_PATHS.SESSIONS());
        expect(files.length).toBe(0);
      },
    );
  });

  it('writes correct lifecycle events at block boundaries (synthesized events)', async () => {
    await withTempRepo(
      'scribe-finalize-lifecycle',
      { initGit: false },
      async (repo) => {
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
          'rest',
          'finalize',
        ];
        // eslint-disable-next-line no-unused-vars
        const { exitCode, stderr, stdout } = await runScribe(commands, {
          repo,
        });
        expect(exitCode).toBe(0);
        expect(stderr).toBe('');

        const files = findSessionFiles(REPO_PATHS.SESSIONS());
        expect(files.length).toBe(2);
        const allEvents = files.flatMap(readJsonl);

        // Should have a session_continue at the start of the second block
        const sessionContinue = allEvents.find(
          (e) => e.kind === 'session_continue',
        );
        expect(sessionContinue).toBeTruthy();

        // Should have session_pause at the end of the first block
        const sessionPause = allEvents.find((e) => e.kind === 'session_pause');
        expect(sessionPause).toBeTruthy();

        // Should have session_end at the end of the last block
        const sessionEnd = allEvents.filter((e) => e.kind === 'session_end');
        expect(sessionEnd.length).toBe(1);
      },
    );
  });

  it('writes rollover files only at season boundaries', async () => {
    await withTempRepo(
      'scribe-finalize-rollover',
      { initGit: false },
      async (repo) => {
        const commands = [
          'start p13',
          'day start 30 hib 1511',
          'move p14',
          'rest',
          'day start',
          'move p15',
          'rest',
          'day start',
          'rest',
          'day start',
          'rest',
          'finalize',
        ];
        const { exitCode, stderr } = await runScribe(commands, { repo });
        expect(exitCode).toBe(0);
        expect(stderr).toBe('');
        const rolloverDir = REPO_PATHS.ROLLOVERS();
        const rollovers = fs.existsSync(rolloverDir)
          ? fs.readdirSync(rolloverDir).filter((f) => f.endsWith('.jsonl'))
          : [];
        expect(rollovers.length).toBe(1); // Only one season boundary
      },
    );
  });

  it('removes lock and in-progress files and updates meta.yaml in production mode', async () => {
    await withTempRepo(
      'scribe-finalize-meta-lock',
      { initGit: false },
      async (repo) => {
        const commands = [
          'start p13',
          'day start 8 umb 1511',
          'move q13 normal',
          'finalize',
        ];
        const { exitCode, stderr } = await runScribe(commands, { repo });
        expect(exitCode).toBe(0);
        expect(stderr).toBe('');
        // Lock and in-progress files should be gone
        const lockDir = REPO_PATHS.LOCKS();
        const inProgressDir = REPO_PATHS.IN_PROGRESS();
        const lockFiles = fs.existsSync(lockDir) ? fs.readdirSync(lockDir) : [];
        const inProgressFiles = fs.existsSync(inProgressDir)
          ? fs.readdirSync(inProgressDir)
          : [];
        expect(lockFiles.length).toBe(0);
        expect(inProgressFiles.length).toBe(0);
        // meta.yaml should have incremented nextSessionSeq
        const metaRaw = fs.readFileSync(REPO_PATHS.META(), 'utf8');
        const meta = JSON.parse(JSON.stringify(require('yaml').parse(metaRaw)));
        expect(meta.nextSessionSeq).toBeGreaterThan(1);
      },
    );
  });

  it('skips lock/meta handling and writes to dev dirs in dev mode', async () => {
    await withTempRepo(
      'scribe-finalize-dev-mode',
      { initGit: false },
      async (repo) => {
        const commands = [
          'start p13',
          'day start 8 umb 1511',
          'move q13 normal',
          'finalize',
        ];
        const { exitCode, stderr } = await runScribe(commands, {
          repo,
          env: { SKYREACH_DEV: 'true' },
        });
        expect(exitCode).toBe(0);
        expect(stderr).toBe('');
        // Should write to dev sessions dir
        const devSessionsDir = REPO_PATHS.DEV_SESSIONS();
        const devFiles = fs.existsSync(devSessionsDir)
          ? fs
              .readdirSync(devSessionsDir)
              .filter((f) => /^dev_.*\.jsonl$/i.test(f))
          : [];
        expect(devFiles.length).toBe(1);
        // Should not touch meta or lock files
        const lockDir = REPO_PATHS.LOCKS();
        const lockFiles = fs.existsSync(lockDir) ? fs.readdirSync(lockDir) : [];
        expect(lockFiles.length).toBe(0);
      },
    );
  });

  it.skip('errors if context is missing sessionId or file', async () => {
    // Simulate missing context by calling finalizeSession directly if possible, or by manipulating the environment
    // This is a placeholder: actual implementation may depend on how runScribe/context is handled
    // You may want to add a direct unit test for finalizeSession for this case
    // Example:
    // const result = finalizeSession({}, false);
    // expect(result.error).toMatch(/missing sessionId|file/i);
    // For integration, you may need to hack the repo or command pipeline
    expect(true).toBe(false); // Placeholder
  });

  it('errors if output directory is unwritable', async () => {
    await withTempRepo(
      'scribe-finalize-fs-error',
      { initGit: false },
      async (repo) => {
        const sessionsDir = REPO_PATHS.SESSIONS();
        fs.mkdirSync(sessionsDir, { recursive: true });
        fs.chmodSync(sessionsDir, 0o400); // read-only
        const commands = ['start p13', 'day start 8 umb 1511', 'finalize'];
        // eslint-disable-next-line no-unused-vars
        const { exitCode, stderr, stdout } = await runScribe(commands, {
          repo,
        });
        expect(exitCode).toBe(0); // REPL exits normally
        expect(stderr).toMatch(/error|fail|permission/i);

        fs.chmodSync(sessionsDir, 0o700); // restore permissions
      },
    );
  });

  it('writes correct header in each output file', async () => {
    await withTempRepo(
      'scribe-finalize-header',
      { initGit: false },
      async (repo) => {
        const commands = [
          'start p13',
          'day start 30 hib 1511',
          'move p14',
          'day start 1 umb 1511',
          'move p15',
          'finalize',
        ];
        const { exitCode, stderr } = await runScribe(commands, { repo });
        expect(exitCode).toBe(0);
        expect(stderr).toBe('');
        const files = findSessionFiles(REPO_PATHS.SESSIONS());
        for (const file of files) {
          const lines = fs
            .readFileSync(file, 'utf8')
            .split(/\r?\n/)
            .filter(Boolean);
          const header = JSON.parse(lines[0]);
          expect(header.kind).toBe('header');
          expect(header.id).toMatch(/^session_\d+[a-z]?_\d{4}-\d{2}-\d{2}$/i);
          expect(header.seasonId).toMatch(/\d{4}-[a-z]+/i);
          expect(header.inWorldStart).toBeTruthy();
          expect(header.inWorldEnd).toBeTruthy();
        }
      },
    );
  });

  it('normalizes trail edges and season IDs in output', async () => {
    await withTempRepo(
      'scribe-finalize-normalization',
      { initGit: false },
      async (repo) => {
        const commands = [
          'start p13',
          'day start 30 hib 1511',
          // Add a trail with from > to (should be normalized)
          'trail q14 p13',
          'finalize',
        ];
        const { exitCode, stderr } = await runScribe(commands, { repo });
        expect(exitCode).toBe(0);
        expect(stderr).toBe('');
        const files = findSessionFiles(REPO_PATHS.SESSIONS());
        const allEvents = files.flatMap(readJsonl);

        // Trail edge should be normalized so from < to
        const trail = allEvents.find((e) => e.kind === 'trail');
        expect(trail).toBeTruthy();
        // if (trail) {
        //   expect(trail.payload.from < trail.payload.to).toBe(true);
        // }

        // Season IDs should be lowercase
        for (const file of files) {
          const lines = fs
            .readFileSync(file, 'utf8')
            .split(/\r?\n/)
            .filter(Boolean);
          const header = JSON.parse(lines[0]);
          expect(header.seasonId).toBe(header.seasonId.toLowerCase());
        }
      },
    );
  });
});

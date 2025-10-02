import { type Event, eventsOf, pad } from '@skyreach/cli-kit';
import { readJsonl, REPO_PATHS } from '@skyreach/data';
import {
  findSessionFiles,
  runScribe,
  withTempRepo,
} from '@skyreach/test-helpers';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import yaml from 'yaml';

describe('scribe start', () => {
  it('emits exactly one session_start with the requested startHex and writes a minimal valid log', async () => {
    await withTempRepo(
      'scribe-start-happy',
      { initGit: false },
      async (repo) => {
        const commands = [
          'start p13',
          'day start 8 umb 1511',
          'move q13 normal',
          'exit',
        ];

        // eslint-disable-next-line no-unused-vars
        const { exitCode, stderr, stdout } = await runScribe(commands, { repo });
        expect(exitCode).toBe(0);
        expect(stderr).toBeFalsy();

        const files = findSessionFiles(REPO_PATHS.SESSIONS());
        expect(files.length).toBe(1);

        const events: Event[] = readJsonl(files[0]);

        // Exactly one session_start, with correct startHex
        const starts = eventsOf(events, 'session_start');
        expect(starts.length).toBe(1);
        expect(starts[0].payload.startHex).toBe('P13');

        // At least one day_start, normalized season
        const days = eventsOf(events, 'day_start');
        expect(days.length).toBeGreaterThanOrEqual(1);
        expect(days[0].payload.calendarDate).toEqual({
          year: 1511,
          month: 'Umbraeus',
          day: 8,
        });
        expect(String(days[0].payload.season).toLowerCase()).toBe('autumn');

        // Move to Q13 was recorded; from may be null or 'P13' per spec
        const moves = eventsOf(events, 'move');
        expect(moves.length).toBe(1);
        expect(moves[0].payload.to).toBe('Q13');

        // Finalize appended exactly one session_end
        const ends = eventsOf(events, 'session_end');
        expect(ends.length).toBe(1);
      },
    );
  });

  it('rejects a second start in the same session (no second session_start event)', async () => {
    await withTempRepo(
      'scribe-start-double',
      { initGit: false },
      async (repo) => {
        const commands = [
          'start P13',
          'start Q12', // should be refused
          'day start 8 umb 1511',
          'finalize',
          'exit',
        ];

        const { exitCode, stderr } = await runScribe(commands, { repo });
        expect(exitCode).toBe(0);

        // REPL likely stays alive and exits 0; we assert on log semantics instead of exitCode
        expect(typeof stderr).toBe('string'); // may contain an error message, but don't depend on exact text

        const files = findSessionFiles(REPO_PATHS.SESSIONS());
        expect(files.length).toBe(1);

        const events = readJsonl(files[0]);

        const starts = eventsOf(events, 'session_start');
        expect(starts.length).toBe(1);
        expect(starts[0].payload.startHex).toBe('P13'); // original start is kept

        const ends = eventsOf(events, 'session_end');
        expect(ends.length).toBe(1);
      },
    );
  });

  it("allows a subsequent move (without 'from') after start and preserves ordering", async () => {
    await withTempRepo(
      'scribe-start-then-move',
      { initGit: false },
      async (repo) => {
        const commands = [
          'start P13',
          'day start 8 umb 1511',
          'move Q13 normal',
          'move Q14 slow', // no 'from' again; we care that both moves are present and ordered
        ];

        const { exitCode } = await runScribe(commands, { repo });
        expect(exitCode).toBe(0);

        const files = findSessionFiles(REPO_PATHS.SESSIONS());
        expect(files.length).toBe(1);

        const events = readJsonl(files[0]);
        const moves = eventsOf(events, 'move');
        expect(moves.length).toBe(2);
        expect(moves.map((m) => m.payload.to)).toEqual(['Q13', 'Q14']);

        // Not asserting specific 'from' here (it may be null per spec), just the sequence and targets
      },
    );
  });

  it('prints usage and does not create a session file if no arguments are given', async () => {
    await withTempRepo(
      'scribe-start-no-args',
      { initGit: false },
      async (repo) => {
        const commands = [
          'start', // no arguments
          'exit',
        ];
        const { exitCode, stdout } = await runScribe(commands, { repo });
        expect(exitCode).toBe(0); // REPL exits normally
        expect(stdout).toMatch(/usage|hex/i);
        const files = findSessionFiles(REPO_PATHS.SESSIONS());
        expect(files.length).toBe(0);
      },
    );
  });

  it('prints error and does not create a session file if hex is invalid', async () => {
    await withTempRepo(
      'scribe-start-invalid-hex',
      { initGit: false },
      async (repo) => {
        const commands = [
          'start ZZZ', // invalid hex
          'exit',
        ];
        const { exitCode, stdout } = await runScribe(commands, { repo });
        expect(exitCode).toBe(0); // REPL exits normally
        expect(stdout).toMatch(/usage|hex/i);
        const files = findSessionFiles(REPO_PATHS.SESSIONS());
        expect(files.length).toBe(0);
      },
    );
  });

  it('creates a dev session file in _dev/ with dev-mode flag, no lock file, and sessionId matches filename stem', async () => {
    await withTempRepo(
      'scribe-start-dev-mode',
      { initGit: false },
      async (repo) => {
        const commands = ['start P13', 'day start 8 umb 1511', 'exit'];
        const { exitCode, stderr } = await runScribe(commands, {
          repo,
          env: { SKYREACH_DEV: 'true' },
        });
        expect(exitCode).toBe(0);
        expect(stderr).toBeFalsy();
        const devSessionsDir = REPO_PATHS.DEV_SESSIONS();
        const devFiles = fs.existsSync(devSessionsDir)
          ? fs
              .readdirSync(devSessionsDir)
              .filter((f) => /^dev_.*\.jsonl$/i.test(f))
          : [];
        expect(devFiles.length).toBe(1);
        const devFile = path.join(devSessionsDir, devFiles[0]);
        const events = readJsonl(devFile);
        const starts = eventsOf(events, 'session_start');
        expect(starts.length).toBe(1);

        // sessionId matches filename stem
        const sessionId = starts[0].payload.id;
        const stem = path.basename(devFile, '.jsonl');
        expect(sessionId).toBe(stem);

        // No lock file should exist
        const lockDir = REPO_PATHS.LOCKS();
        const lockFiles = fs.existsSync(lockDir)
          ? fs.readdirSync(lockDir).filter((f) => f.endsWith('.lock'))
          : [];
        expect(lockFiles.length).toBe(0);
      },
    );
  });

  it('aborts with error if lock file for next session sequence exists (production mode)', async () => {
    await withTempRepo(
      'scribe-start-lock-conflict',
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

        const inProgressDir = REPO_PATHS.IN_PROGRESS();
        fs.mkdirSync(inProgressDir, { recursive: true });
        const sessionFile = path.join(inProgressDir, `${sessionId}.jsonl`);
        const events = [
          {
            kind: 'session_start',
            status: 'in-progress',
            id: sessionId,
            startHex: 'P13',
          },
          { kind: 'move', payload: { from: 'P13', to: 'Q13', pace: 'normal' } },
        ];
        fs.writeFileSync(
          sessionFile,
          events.map((e) => JSON.stringify(e)).join('\n') + '\n',
        );

        const commands = ['start r14', 'exit'];
        const { exitCode, stderr } = await runScribe(commands, {
          repo,
          ensureExit: false,
          ensureFinalize: false,
        });
        expect(exitCode).toBe(0); // REPL exits normally
        expect(stderr).toMatch(
          new RegExp(
            `Lock file exists for session sequence 27 (.*). Another session may be active.`,
            'i',
          ),
        );
        const files = findSessionFiles(REPO_PATHS.IN_PROGRESS());
        expect(files.length).toBe(1); // One file we created for the test, none created by the tool
      },
    );
  });

  it('resumes existing in-progress session file, prints resume message, and does not emit new session_start', async () => {
    await withTempRepo(
      'scribe-start-resume',
      { initGit: false },
      async (repo) => {
        // Read the next session number from the meta file
        const meta = yaml.parse(fs.readFileSync(REPO_PATHS.META(), 'utf8'));
        const nextSessionNumber = String(meta.nextSessionSeq || 1).padStart(
          4,
          '0',
        );
        const date = new Date().toISOString().slice(0, 10);
        const sessionId = `session_${nextSessionNumber}_${date}`;

        // Simulate an in-progress session file with one session_start and one move
        const inProgressDir = REPO_PATHS.IN_PROGRESS();
        fs.mkdirSync(inProgressDir, { recursive: true });
        const sessionFile = path.join(inProgressDir, `${sessionId}.jsonl`);
        const events = [
          {
            kind: 'session_start',
            status: 'in-progress',
            id: sessionId,
            startHex: 'P13',
          },
          { kind: 'move', payload: { from: 'P13', to: 'Q13', pace: 'normal' } },
        ];
        fs.writeFileSync(
          sessionFile,
          events.map((e) => JSON.stringify(e)).join('\n') + '\n',
        );

        const commands = ['start P13', 'exit'];
        const { exitCode, stdout } = await runScribe(commands, {
          repo,
          ensureFinalize: false,
        });
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(
          new RegExp(`resumed: ${sessionId} \\(2 events\\).*last hex Q13`, 'i'),
        ); // Should not emit a new session_start event
        const fileEvents = readJsonl(sessionFile);
        const starts = eventsOf(fileEvents, 'session_start');
        expect(starts.length).toBe(1);
      },
    );
  });

  it('prints error and does not create session or lock file if session log dir is unwritable', async () => {
    await withTempRepo(
      'scribe-start-fs-error',
      { initGit: false },
      async (repo) => {
        const sessionsDir = REPO_PATHS.SESSIONS();
        fs.mkdirSync(sessionsDir, { recursive: true });
        fs.chmodSync(sessionsDir, 0o400); // read-only
        let errorCaught = false;
        try {
          const commands = ['start P13', 'exit'];
          const { exitCode, stdout } = await runScribe(commands, { repo });
          expect(exitCode).toBe(0);
          expect(stdout).toMatch(/error|fail|permission/i);
          const files = findSessionFiles(REPO_PATHS.SESSIONS());
          expect(files.length).toBe(0);
          // eslint-disable-next-line no-unused-vars
        } catch (e) {
          errorCaught = true;
        } finally {
          fs.chmodSync(sessionsDir, 0o700); // restore permissions
        }
        expect(errorCaught).toBe(false); // test should not throw
      },
    );
  });
});

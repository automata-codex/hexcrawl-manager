import fs from 'fs';
import path from 'path';
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

  it("errors if there is no day_start event", async () => {
    await withTempRepo("scribe-finalize-no-daystart", { initGit: false }, async (repo) => {
      const commands = [
        "start p13",
        "move p14",
        "finalize"
      ];
      const { exitCode, stderr } = await runScribe(commands, { repo });
      expect(exitCode).toBe(0); // REPL exits normally
      expect(stderr).toMatch(/no day_start/i);
      const files = findSessionFiles(REPO_PATHS.SESSIONS());
      expect(files.length).toBe(0);
    });
  });

  it("errors if first event is not session_start or session_continue", async () => {
    await withTempRepo("scribe-finalize-bad-first-event", { initGit: false }, async (repo) => {
      // Manually write a bad in-progress file
      const inProgressDir = REPO_PATHS.IN_PROGRESS();
      fs.mkdirSync(inProgressDir, { recursive: true });
      const sessionId = `session_0027_2025-09-20`;
      const sessionFile = path.join(inProgressDir, `${sessionId}.jsonl`);
      fs.writeFileSync(sessionFile, JSON.stringify({ kind: "move", payload: { from: "P13", to: "Q13" } }) + "\n");

      const commands = ["finalize"];
      const { exitCode, stderr, stdout } = await runScribe(commands, { repo });

      expect(exitCode).toBe(0); // REPL exits normally
      expect(stdout).toMatch(/start or resume a session first/i);
      const files = findSessionFiles(REPO_PATHS.SESSIONS());
      expect(files.length).toBe(0);
    });
  });

  // Silly Copilot, there is no `session` command
  it.skip("errors if session_pause appears before the end", async () => {
    await withTempRepo("scribe-finalize-pause-mid", { initGit: false }, async (repo) => {
      const commands = [
        "start p13",
        "day start 8 umb 1511",
        "session pause",
        "move q13 normal",
        "finalize"
      ];
      const { exitCode, stdout } = await runScribe(commands, { repo });

      expect(exitCode).toBe(0); // REPL exits normally
      expect(stdout).toMatch(/session_pause may only appear at the end/i);
      const files = findSessionFiles(REPO_PATHS.SESSIONS());
      expect(files.length).toBe(0);
    });
  });

  it.skip("errors if timestamps are non-monotonic", async () => {
    await withTempRepo("scribe-finalize-bad-ts", { initGit: false }, async (repo) => {
      // Manually write a bad in-progress file
      const inProgressDir = REPO_PATHS.IN_PROGRESS();
      fs.mkdirSync(inProgressDir, { recursive: true });
      const sessionId = `session_0027_2025-09-20`;
      const sessionFile = path.join(inProgressDir, `${sessionId}.jsonl`);
      const events = [
        { kind: "session_start", ts: "2025-09-20T10:00:00.000Z" },
        { kind: "day_start", payload: { calendarDate: { year: 1511, month: "Umbraeus", day: 8 }, season: "autumn" }, ts: "2025-09-20T09:00:00.000Z" }
      ];
      fs.writeFileSync(sessionFile, events.map(e => JSON.stringify(e)).join("\n") + "\n");
      const commands = ["finalize"];
      const { exitCode, stderr } = await runScribe(commands, { repo });
      expect(exitCode).not.toBe(0);
      expect(stderr).toMatch(/non-monotonic timestamps/i);
      const files = findSessionFiles(REPO_PATHS.SESSIONS());
      expect(files.length).toBe(0);
    });
  });

  it.skip("errors if sequence numbers are non-monotonic", async () => {
    await withTempRepo("scribe-finalize-bad-seq", { initGit: false }, async (repo) => {
      // Manually write a bad in-progress file
      const inProgressDir = REPO_PATHS.IN_PROGRESS();
      fs.mkdirSync(inProgressDir, { recursive: true });
      const sessionId = `session_0027_2025-09-20`;
      const sessionFile = path.join(inProgressDir, `${sessionId}.jsonl`);
      const events = [
        { kind: "session_start", seq: 2 },
        { kind: "day_start", payload: { calendarDate: { year: 1511, month: "Umbraeus", day: 8 }, season: "autumn" }, seq: 1 }
      ];
      fs.writeFileSync(sessionFile, events.map(e => JSON.stringify(e)).join("\n") + "\n");
      const commands = ["finalize"];
      const { exitCode, stderr } = await runScribe(commands, { repo });
      expect(exitCode).not.toBe(0);
      expect(stderr).toMatch(/non-monotonic sequence numbers/i);
      const files = findSessionFiles(REPO_PATHS.SESSIONS());
      expect(files.length).toBe(0);
    });
  });

  it.skip("errors if no lock file exists in production mode", async () => {
    await withTempRepo("scribe-finalize-no-lock", { initGit: false }, async (repo) => {
      // Remove lock file if present
      const lockDir = REPO_PATHS.LOCKS();
      if (fs.existsSync(lockDir)) {
        for (const f of fs.readdirSync(lockDir)) {
          fs.unlinkSync(path.join(lockDir, f));
        }
      }
      const commands = [
        "start p13",
        "day start 8 umb 1511",
        "move q13 normal",
        "finalize"
      ];
      const { exitCode, stderr } = await runScribe(commands, { repo });
      expect(exitCode).not.toBe(0);
      expect(stderr).toMatch(/no lock file/i);
      const files = findSessionFiles(REPO_PATHS.SESSIONS());
      expect(files.length).toBe(0);
    });
  });

  it.skip("writes correct lifecycle events at block boundaries (synthesized events)", async () => {
    await withTempRepo("scribe-finalize-lifecycle", { initGit: false }, async (repo) => {
      const commands = [
        "start p13",
        "day start 30 hib 1511",
        "move p14",
        "day start 1 umb 1511",
        "move p15",
        "finalize"
      ];
      const { exitCode, stderr } = await runScribe(commands, { repo });
      expect(exitCode).toBe(0);
      expect(stderr).toBe("");
      const files = findSessionFiles(REPO_PATHS.SESSIONS());
      expect(files.length).toBe(2);
      const allEvents = files.flatMap(readJsonl);
      // Should have a session_continue at the start of the second block
      const sessionContinue = allEvents.find(e => e.kind === 'session_continue');
      expect(sessionContinue).toBeTruthy();
      // Should have session_pause at the end of the first block
      const sessionPause = allEvents.find(e => e.kind === 'session_pause');
      expect(sessionPause).toBeTruthy();
      // Should have session_end at the end of the last block
      const sessionEnd = allEvents.filter(e => e.kind === 'session_end');
      expect(sessionEnd.length).toBe(1);
    });
  });

  it.skip("writes rollover files only at season boundaries", async () => {
    await withTempRepo("scribe-finalize-rollover", { initGit: false }, async (repo) => {
      const commands = [
        "start p13",
        "day start 30 hib 1511",
        "move p14",
        "day start 1 umb 1511",
        "move p15",
        "finalize"
      ];
      const { exitCode, stderr } = await runScribe(commands, { repo });
      expect(exitCode).toBe(0);
      expect(stderr).toBe("");
      const rolloverDir = REPO_PATHS.ROLLOVERS();
      const rollovers = fs.existsSync(rolloverDir)
        ? fs.readdirSync(rolloverDir).filter(f => f.endsWith('.jsonl'))
        : [];
      expect(rollovers.length).toBe(1); // Only one season boundary
    });
  });

  it.skip("removes lock and in-progress files and updates meta.yaml in production mode", async () => {
    await withTempRepo("scribe-finalize-meta-lock", { initGit: false }, async (repo) => {
      const commands = [
        "start p13",
        "day start 8 umb 1511",
        "move q13 normal",
        "finalize"
      ];
      const { exitCode, stderr } = await runScribe(commands, { repo });
      expect(exitCode).toBe(0);
      expect(stderr).toBe("");
      // Lock and in-progress files should be gone
      const lockDir = REPO_PATHS.LOCKS();
      const inProgressDir = REPO_PATHS.IN_PROGRESS();
      const lockFiles = fs.existsSync(lockDir) ? fs.readdirSync(lockDir) : [];
      const inProgressFiles = fs.existsSync(inProgressDir) ? fs.readdirSync(inProgressDir) : [];
      expect(lockFiles.length).toBe(0);
      expect(inProgressFiles.length).toBe(0);
      // meta.yaml should have incremented nextSessionSeq
      const metaRaw = fs.readFileSync(REPO_PATHS.META(), 'utf8');
      const meta = JSON.parse(JSON.stringify(require('yaml').parse(metaRaw)));
      expect(meta.nextSessionSeq).toBeGreaterThan(1);
    });
  });

  it.skip("skips lock/meta handling and writes to dev dirs in dev mode", async () => {
    await withTempRepo("scribe-finalize-dev-mode", { initGit: false }, async (repo) => {
      const commands = [
        "start p13",
        "day start 8 umb 1511",
        "move q13 normal",
        "finalize"
      ];
      const { exitCode, stderr } = await runScribe(commands, { repo, env: { SKYREACH_DEV: 'true' } });
      expect(exitCode).toBe(0);
      expect(stderr).toBe("");
      // Should write to dev sessions dir
      const devSessionsDir = REPO_PATHS.DEV_SESSIONS();
      const devFiles = fs.existsSync(devSessionsDir)
        ? fs.readdirSync(devSessionsDir).filter((f) => /^dev_.*\.jsonl$/i.test(f))
        : [];
      expect(devFiles.length).toBe(1);
      // Should not touch meta or lock files
      const lockDir = REPO_PATHS.LOCKS();
      const lockFiles = fs.existsSync(lockDir) ? fs.readdirSync(lockDir) : [];
      expect(lockFiles.length).toBe(0);
    });
  });
});

// tests/scribe.start.spec.ts
import { describe, it, expect } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { runScribe, withTempRepo } from "../../shared-lib";
import { REPO_PATHS } from '../../shared-lib/constants';
import { type Event } from '../types.ts';

/** Utilities local to this test file */
function findSessionFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((f) => /^session_\d+_\d{4}-\d{2}-\d{2}\.jsonl$/i.test(f))
    .map((f) => path.join(dir, f));
}

function readJsonl(file: string): any[] {
  const raw = fs.readFileSync(file, "utf8");
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function eventsOf(events: Event[], kind: string): Event[] {
  return events.filter((e) => e.kind === kind);
}

describe("scribe start", () => {
  it("emits exactly one session_start with the requested startHex and writes a minimal valid log", async () => {
    await withTempRepo("scribe-start-happy", { initGit: false }, async (repo) => {
      const commands = [
        "start p13",
        "day start 8 umb 1511",
        "move q13 normal",
        "exit",
      ];

      const { exitCode, stderr } = await runScribe(commands, { repo });
      expect(exitCode).toBe(0);
      expect(stderr).toBeFalsy();

      const files = findSessionFiles(REPO_PATHS.SESSIONS());
      expect(files.length).toBe(1);

      const events: Event[] = readJsonl(files[0]);

      // Exactly one session_start, with correct startHex
      const starts = eventsOf(events, "session_start");
      expect(starts.length).toBe(1);
      expect(starts[0].payload.startHex).toBe("P13");

      // At least one day_start, normalized season
      const days = eventsOf(events, "day_start");
      expect(days.length).toBeGreaterThanOrEqual(1);
      expect(days[0].payload.calendarDate).toEqual({
        year: 1511,
        month: 'Umbraeus',
        day: 8,
      });
      expect(String(days[0].payload.season).toLowerCase()).toBe("autumn");

      // Move to Q13 was recorded; from may be null or 'P13' per spec
      const moves = eventsOf(events, "move");
      expect(moves.length).toBe(1);
      expect(moves[0].payload.to).toBe("Q13");

      // Finalize appended exactly one session_end
      const ends = eventsOf(events, "session_end");
      expect(ends.length).toBe(1);
    });
  });

  it("rejects a second start in the same session (no second session_start event)", async () => {
    await withTempRepo("scribe-start-double", { initGit: false }, async (repo) => {
      const commands = [
        "start P13",
        "start Q12", // should be refused
        "day start 8 umb 1511",
        "finalize",
        "exit",
      ];

      const { exitCode, stderr } = await runScribe(commands, { repo });
      expect(exitCode).toBe(0);

      // REPL likely stays alive and exits 0; we assert on log semantics instead of exitCode
      expect(typeof stderr).toBe("string"); // may contain an error message, but don't depend on exact text

      const files = findSessionFiles(REPO_PATHS.SESSIONS());
      expect(files.length).toBe(1);

      const events = readJsonl(files[0]);

      const starts = eventsOf(events, "session_start");
      expect(starts.length).toBe(1);
      expect(starts[0].payload.startHex).toBe("P13"); // original start is kept

      const ends = eventsOf(events, "session_end");
      expect(ends.length).toBe(1);
    });
  });

  it.skip("allows a subsequent move (without 'from') after start and preserves ordering", async () => {
    await withTempRepo("scribe-start-then-move", { initGit: false }, async (repo) => {
      const commands = [
        "start P13",
        "day 1511-12-01 winter",
        "move Q13 normal",
        "move Q14 slow", // no 'from' again; we care that both moves are present and ordered
      ];

      const { exitCode } = await runScribe(commands, { repo });
      expect(exitCode).toBe(0);

      const files = findSessionFiles(REPO_PATHS.SESSIONS());
      expect(files.length).toBe(1);

      const events = readJsonl(files[0]);
      const moves = eventsOf(events, "move");
      expect(moves.length).toBe(2);
      expect(moves.map((m) => m.payload.to)).toEqual(["Q13", "Q14"]);

      // Not asserting specific 'from' here (it may be null per spec), just the sequence and targets
    });
  });
});

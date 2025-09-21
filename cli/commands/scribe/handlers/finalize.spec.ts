import { describe, it, expect } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { runScribe, withTempRepo } from '../../shared-lib';
import { REPO_PATHS } from '../../shared-lib/constants';

function findSessionFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((f) => /^session_\d+[a-z]?_\d{4}-\d{2}-\d{2}\.jsonl$/i.test(f))
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

describe("scribe finalize", () => {
  it("partitions session events correctly and writes output files", async () => {
    await withTempRepo("scribe-finalize-happy", { initGit: false }, async (repo) => {
      const commands = [
        "start p13",
        "day start 30 hib 1511",
        "move p14",
        "rest",
        "day start",
        "rest",
        "day start",
        "rest",
        "day start",
        "move p15",
        "rest",
        "finalize"
      ];
      const { exitCode, stderr } = await runScribe(commands, { repo });

      expect(exitCode).toBe(0);
      expect(stderr).toBe("");

      console.log(`Session dir: ${REPO_PATHS.SESSIONS()}`);

      const files = findSessionFiles(REPO_PATHS.SESSIONS());

      // Gather all events from all session files
      const allEvents = files.flatMap(readJsonl);

      // Find all unique season IDs from day_start events
      const uniqueSeasons = new Set(
        allEvents
          .filter(e => e.kind === 'day_start')
          .map(e => `${e.payload.calendarDate.year}-${String(e.payload.season).toLowerCase()}`)
      );
      console.log(`Unique seasons found: ${[...uniqueSeasons].join(', ')}`);
      expect(files.length).toEqual(uniqueSeasons.size); // Should be one session file per unique season

      // Should contain all moves
      const moves = allEvents.filter(e => e.kind === 'move');
      expect(moves.length).toBe(2);
    });
  });
});

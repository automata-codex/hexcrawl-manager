import { describe, it, expect } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { pad, runScribe, withTempRepo } from '../../shared-lib';
import { type Event } from '../types.ts';
import { REPO_PATHS } from '../../shared-lib/constants';

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

describe("scribe finalize (integration)", () => {
  it("partitions session events correctly and writes output files", async () => {
    await withTempRepo("scribe-finalize-happy", { initGit: false }, async (repo) => {
      const commands = [
        "start p13",
        "day start 31 hib 1511",
        "move q13 normal",
        "rest",
        "day start",
        "move q14 fast",
        "finalize"
      ];
      const { exitCode, stderr } = await runScribe(commands, { repo });

      expect(exitCode).toBe(0);
      expect(stderr).toBe("");

      const files = findSessionFiles(REPO_PATHS.SESSIONS());
      expect(files.length).toEqual(3); // Should be partitioned into 2 session files and 1 rollover file

      const allEvents = files.flatMap(readJsonl);

      // Should contain at least one day_start in each file
      const dayStarts = allEvents.filter(e => e.kind === 'day_start');
      expect(dayStarts.length).toBe(2);

      // Should contain all moves
      const moves = allEvents.filter(e => e.kind === 'move');
      expect(moves.length).toBe(2);
    });
  });
});


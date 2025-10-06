import { padSessionNum } from '@skyreach/core';
import { ScribeEvent } from '@skyreach/schemas';
import fs from 'fs';
import path from 'path';

import {
  FinalizedLogJsonParseError,
  FinalizedLogsNotFoundError,
} from './errors';
import { REPO_PATHS } from './repo-paths';

export interface FinalizedLogInfo {
  filename: string; // basename
  fullPath: string; // joined with REPO_PATHS.SESSIONS()
  sessionNumber: number; // 1..9999
  suffix?: string; // 'a' .. 'z' if present
  date: string; // 'YYYY-MM-DD'
  variant?: string; // trailing piece after the date, if any
}

// session_0001[a]_YYYY-MM-DD[optional suffix].jsonl
const SESSION_FILE_RE =
  /^session_(\d{4})([a-z])?_(\d{4}-\d{2}-\d{2})(?:_(.+))?\.jsonl$/;

/** List all finalized scribe logs in the sessions directory. */
export function discoverFinalizedLogs(): FinalizedLogInfo[] {
  const dir = REPO_PATHS.SESSIONS();
  const files = fs.readdirSync(dir);
  const parsed = files
    .map(parseSessionFilename)
    .filter(Boolean) as FinalizedLogInfo[];
  // Use deterministic ordering
  parsed.sort(
    (a, b) =>
      a.sessionNumber - b.sessionNumber ||
      (a.suffix ?? '').localeCompare(b.suffix ?? '') ||
      a.date.localeCompare(b.date),
  );
  return parsed;
}

/** Convenience filter for a specific session number (accepts number or "0001"). */
export function discoverFinalizedLogsFor(
  sessionNumber: number | string,
): FinalizedLogInfo[] {
  const target = padSessionNum(sessionNumber);
  return discoverFinalizedLogs().filter(
    (log) => padSessionNum(log.sessionNumber) === target,
  );
}

/** Convenience guard that throws if nothing matches. */
export function discoverFinalizedLogsForOrThrow(sessionNumber: number | string): FinalizedLogInfo[] {
  const hits = discoverFinalizedLogsFor(sessionNumber);
  if (hits.length === 0) {
    throw new FinalizedLogsNotFoundError(sessionNumber);
  }
  return hits;
}

/** Latest (max) session number, if any. */
export function getLatestSessionNumber(): number | undefined {
  const all = discoverFinalizedLogs();
  if (!all.length) return undefined;
  return all.reduce((max, x) => Math.max(max, x.sessionNumber), 0);
}

export function parseSessionFilename(
  filename: string,
): FinalizedLogInfo | null {
  const m = filename.match(SESSION_FILE_RE);
  if (!m) return null;
  const [, num, suffix, date, variant] = m;
  return {
    filename,
    fullPath: path.join(REPO_PATHS.SESSIONS(), filename),
    sessionNumber: parseInt(num, 10),
    suffix: suffix ?? undefined,
    date,
    variant: variant ?? undefined,
  };
}

/**
 * Reads and concatenates all finalized JSONL events for a given session.
 * Throws FinalizedLogsNotFoundError if no files match,
 * and FinalizedLogJsonParseError with file + line info if parsing fails.
 */
export function readFinalizedJsonl(sessionNumber: number | string): ScribeEvent[] {
  const hits = discoverFinalizedLogsForOrThrow(sessionNumber);
  const allEvents: ScribeEvent[] = [];

  for (const { fullPath } of hits) {
    const text = fs.readFileSync(fullPath, 'utf8');
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const lineNo = i + 1;
      const line = lines[i].trim();
      if (!line) {
        continue; // skip blank lines
      }
      try {
        allEvents.push(JSON.parse(line));
      } catch (e) {
        throw new FinalizedLogJsonParseError(fullPath, lineNo, e);
      }
    }
  }

  return allEvents;
}

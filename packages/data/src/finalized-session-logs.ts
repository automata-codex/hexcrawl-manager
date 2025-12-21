import { ScribeEvent, SessionId, makeSessionId } from '@achm/schemas';
import fs from 'fs';

import {
  FinalizedLogJsonParseError,
  FinalizedLogsNotFoundError,
} from './errors.js';
import { parseSessionFilename } from './filenames.js';
import { REPO_PATHS } from './repo-paths.js';
import { seasonOfSessionFile } from './seasons/index.js';

export interface FinalizedLogInfo {
  filename: string; // basename
  fullPath: string; // joined with REPO_PATHS.SESSIONS()
  sessionNumber: number; // 1..9999
  suffix?: string; // 'a' .. 'z' if present
  date: string; // 'YYYY-MM-DD'
  variant?: string; // trailing piece after the date, if any
}

export interface FinalizedLogWithSeason extends FinalizedLogInfo {
  seasonId: string;
}

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

/** Convenience filter for a specific session number (accepts number or "0001" or "session-0001"). */
export function discoverFinalizedLogsFor(
  sessionNumber: SessionId | number | string,
): FinalizedLogInfo[] {
  const target = makeSessionId(sessionNumber);
  return discoverFinalizedLogs().filter(
    (log) => makeSessionId(log.sessionNumber) === target,
  );
}

/** Convenience guard that throws if nothing matches. */
export function discoverFinalizedLogsForOrThrow(
  sessionNumber: number | string,
): FinalizedLogInfo[] {
  const hits = discoverFinalizedLogsFor(sessionNumber);
  if (hits.length === 0) {
    throw new FinalizedLogsNotFoundError(sessionNumber);
  }
  return hits;
}

/** Add `seasonId` to each log by reading its first day_start event. */
export function enrichLogsWithSeason(
  logs: FinalizedLogInfo[],
): FinalizedLogWithSeason[] {
  return logs.map((l) => ({
    ...l,
    seasonId: seasonOfSessionFile(l.fullPath),
  }));
}

/** Latest (max) session number, if any. */
export function getLatestSessionNumber(): number | undefined {
  const all = discoverFinalizedLogs();
  if (!all.length) return undefined;
  return all.reduce((max, x) => Math.max(max, x.sessionNumber), 0);
}

/**
 * Reads and concatenates all finalized JSONL events for a given session.
 * Throws FinalizedLogsNotFoundError if no files match,
 * and FinalizedLogJsonParseError with file + line info if parsing fails.
 * Filters out header lines (kind === 'header').
 */
export function readAllFinalizedLogsForSession(
  sessionNumber: number | string,
): ScribeEvent[] {
  const hits = discoverFinalizedLogsForOrThrow(sessionNumber);
  const allEvents: ScribeEvent[] = [];

  for (const { fullPath } of hits) {
    allEvents.push(...readOneFinalizedLog(fullPath));
  }

  return allEvents;
}

export function readOneFinalizedLog(filePath: string): ScribeEvent[] {
  const events: ScribeEvent[] = [];

  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i].trim();
    if (!line) {
      continue; // skip blank lines
    }
    try {
      const parsed = JSON.parse(line);
      // Skip header lines
      if (parsed.kind === 'header') {
        continue;
      }
      events.push(parsed);
    } catch (e) {
      throw new FinalizedLogJsonParseError(filePath, lineNo, e);
    }
  }
  return events;
}

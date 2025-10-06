import { padSessionNum } from '@skyreach/core';
import fs from 'fs';
import path from 'path';

import { REPO_PATHS } from './repo-paths';

export class FinalizedLogsNotFoundError extends Error {
  constructor(public readonly sessionNumber: string | number) {
    super(`No finalized scribe logs found for session ${padSessionNum(sessionNumber)}.`);
    this.name = 'FinalizedLogsNotFoundError';
  }
}

export class FinalizedLogJsonParseError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly line: number,
    public readonly cause?: unknown
  ) {
    super(`Malformed JSON in ${filePath} at line ${line}.`);
    this.name = 'FinalizedLogJsonParseError';
    (this as any).cause = cause;
  }
}

export interface FinalizedLogInfo {
  filename: string;      // basename
  fullPath: string;      // joined with REPO_PATHS.SESSIONS()
  sessionNumber: number; // 1..9999
  suffix?: string;       // 'a' .. 'z' if present
  date: string;          // 'YYYY-MM-DD'
  variant?: string;      // trailing piece after the date, if any
}

// session_0001[a]_YYYY-MM-DD[optional suffix].jsonl
const SESSION_FILE_RE =
  /^session_(\d{4})([a-z])?_(\d{4}-\d{2}-\d{2})(?:_(.+))?\.jsonl$/;

/** List all finalized scribe logs in the sessions directory. */
export function discoverFinalizedLogs(): FinalizedLogInfo[] {
  const dir = REPO_PATHS.SESSIONS();
  const files = fs.readdirSync(dir);
  const parsed = files.map(parseSessionFilename).filter(Boolean) as FinalizedLogInfo[];
  // If you ever want deterministic ordering:
  parsed.sort((a, b) => a.sessionNumber - b.sessionNumber || (a.suffix ?? '').localeCompare(b.suffix ?? '') || a.date.localeCompare(b.date));
  return parsed;
}

/** Convenience filter for a specific session number (accepts number or "0001"). */
export function discoverFinalizedLogsFor(sessionNumber: number | string): FinalizedLogInfo[] {
  const target = padSessionNum(sessionNumber);
  return discoverFinalizedLogs().filter(
    (log) => padSessionNum(log.sessionNumber) === target,
  );
}

/** Latest (max) session number, if any. */
export function getLatestSessionNumber(): number | undefined {
  const all = discoverFinalizedLogs();
  if (!all.length) return undefined;
  return all.reduce((max, x) => Math.max(max, x.sessionNumber), 0);
}

export function parseSessionFilename(filename: string): FinalizedLogInfo | null {
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

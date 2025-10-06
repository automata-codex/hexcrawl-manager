import fs from 'fs';
import path from 'path';

import { REPO_PATHS } from './repo-paths';

// session_0001[a]_YYYY-MM-DD[optional suffix].jsonl
const SESSION_FILE_RE =
  /^session_(\d{4})([a-z])?_(\d{4}-\d{2}-\d{2})(?:_(.+))?\.jsonl$/;

export interface FinalizedLogInfo {
  filename: string;      // basename
  fullPath: string;      // joined with REPO_PATHS.SESSIONS()
  sessionNumber: number; // 1..9999
  suffix?: string;       // 'a' .. 'z' if present
  date: string;          // 'YYYY-MM-DD'
  variant?: string;      // trailing piece after the date, if any
}

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
  const target = typeof sessionNumber === 'number'
    ? String(sessionNumber).padStart(4, '0')
    : sessionNumber;
  return discoverFinalizedLogs().filter(
    (log) => String(log.sessionNumber).padStart(4, '0') === target,
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

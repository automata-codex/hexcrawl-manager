import { REPO_PATHS } from '@skyreach/data';
import { glob } from 'glob';
import path from 'path';

/**
 * @deprecated Use `discoverFinalizedLogs` from `@skyreach/data` instead.
 * Discover finalized scribe logs for a given session number.
 * @param sessionNumber
 * @returns Array of absolute paths to finalized scribe logs for the given session number
 */
export function discoverFinalizedScribeLogs(sessionNumber: string): string[] {
  const base = REPO_PATHS.SESSIONS();

  // Match both `session_` and `session-` prefixes, with optional [a-z] suffix before date
  const patterns = [
    path.join(base, `session[_-]${sessionNumber}_*.jsonl`),
    path.join(base, `session[_-]${sessionNumber}[a-z]_*.jsonl`),
  ];

  const files = patterns.flatMap((p) => glob.sync(p));
  return Array.from(new Set(files));
}

import { assertSeasonId } from '@skyreach/core';
import path from 'path';

import { FinalizedLogInfo } from './finalized-session-logs';
import { ROLLOVER_FILE_RE, SESSION_FILE_RE } from './regex';
import { REPO_PATHS } from './repo-paths';

export function buildRolloverFilename(season: string): string {
  return `rollover_${season}.jsonl`;
}

export function buildSessionFilename(
  sessionNumber: number,
  sessionDate: string,
  suffix?: string,
): string {
  return `session-${sessionNumber}_${sessionDate}${suffix ?? ''}.jsonl`;
}

export function parseRolloverFilename(base: string) {
  const m = base.match(ROLLOVER_FILE_RE);
  return m ? { seasonId: assertSeasonId(`${m[1]}-${m[2]}`) } : null;
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

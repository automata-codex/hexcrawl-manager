import { assertSeasonId, normalizeSeasonId } from '@achm/core';
import {
  SessionDateSchema,
  makeSessionId,
  assertSessionId,
  type SessionId,
} from '@achm/schemas';
import path from 'path';

import { FinalizedLogInfo } from './finalized-session-logs.js';
import {
  ROLLOVER_DEV_FILE_RE,
  ROLLOVER_FILE_RE,
  SESSION_FILE_RE,
} from './regex.js';
import { REPO_PATHS } from './repo-paths.js';

export function buildRolloverDevFilename(season: string): string {
  const date = new Date().toISOString();
  const safeDate = date.replace(/:/g, '-');
  return `dev_rollover_${normalizeSeasonId(season)}_${safeDate}.jsonl`;
}

export function buildRolloverFilename(season: string): string {
  return `rollover_${season}.jsonl`;
}

/* eslint-disable no-unused-vars, no-redeclare */
export function buildSessionFilename(
  sessionId: SessionId,
  sessionDate: string,
  suffix?: string,
): string;
export function buildSessionFilename(
  sessionNumber: number,
  sessionDate: string,
  suffix?: string,
): string;
/* eslint-enable no-unused-vars */
export function buildSessionFilename(
  a: string | number,
  sessionDate: string,
  suffix?: string,
): string {
  SessionDateSchema.parse(sessionDate);

  const id = typeof a === 'number' ? makeSessionId(a) : assertSessionId(a);
  return `${id}${suffix ?? ''}_${sessionDate}.jsonl`;
}
/* eslint-enable no-redeclare */

export function parseRolloverDevFilename(base: string) {
  const m = base.match(ROLLOVER_DEV_FILE_RE);
  return m ? { seasonId: assertSeasonId(`${m[1]}-${m[2]}`) } : null;
}

export function parseRolloverFilename(base: string) {
  const m = base.match(ROLLOVER_FILE_RE);
  return m ? { seasonId: assertSeasonId(`${m[1]}-${m[2]}`) } : null;
}

export function parseSessionFilename(
  filename: string,
): FinalizedLogInfo | null {
  const m = filename.match(SESSION_FILE_RE);
  if (!m) {
    return null;
  }
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

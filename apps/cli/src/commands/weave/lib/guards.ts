import { normalizeSeasonId } from '@skyreach/core';
import { MetaData } from '@skyreach/schemas';
import path from 'node:path';

import { getNextUnrolledSeason } from './files';

export function isRolloverAlreadyApplied(
  meta: MetaData,
  fileId: string,
): boolean {
  return meta.appliedSessions?.includes(fileId);
}

export function isRolloverChronologyValid(
  meta: MetaData,
  seasonId: string,
): { valid: boolean; expected: string } {
  const expected = getNextUnrolledSeason(meta);
  // If nothing has been rolled yet, allow any first rollover.
  if (!expected) {
    return { valid: true, expected: '' };
  }

  // Only allow rollover for the next unapplied season
  const valid =
    normalizeSeasonId(seasonId) === normalizeSeasonId(expected);
  return { valid, expected: expected || '' };
}

/** @deprecated Use `isRolloverPath` from `@skyreach/data` instead */
export function isRolloverFile(filePath: string): boolean {
  const dir = path.basename(path.dirname(filePath));
  const base = path.basename(filePath);
  return (
    dir === 'rollovers' &&
    /^rollover_[\w-]+_\d{4}-\d{2}-\d{2}.*\.jsonl$/i.test(base)
  );
}

export function isSessionAlreadyApplied(
  meta: MetaData,
  fileId: string,
): boolean {
  return meta.appliedSessions?.includes(fileId);
}

export function isSessionChronologyValid(
  meta: MetaData,
  seasonId: string,
): { valid: boolean; missing: string[] } {
  // All seasons up to and including this one must be in meta.rolledSeasons
  // For now, just check that this seasonId is in meta.rolledSeasons
  const normalized = normalizeSeasonId(seasonId);
  const rolled = (meta.rolledSeasons || []).map(normalizeSeasonId);
  const valid = rolled.includes(normalized);
  return { valid, missing: valid ? [] : [seasonId] };
}

export function isSessionFile(filePath: string): boolean {
  const dir = path.basename(path.dirname(filePath));
  const base = path.basename(filePath);
  return (
    dir === 'sessions' &&
    /^session_\d+[a-z]?_\d{4}-\d{2}-\d{2}.*\.jsonl$/i.test(base)
  );
}

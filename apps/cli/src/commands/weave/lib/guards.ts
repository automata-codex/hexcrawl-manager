import { normalizeSeasonId, prevSeasonId } from '@skyreach/core';
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

/**
 * Check chronology against meta.rolledSeasons.
 * - If rolledSeasons is empty => valid, no missing.
 * - Otherwise, require a contiguous run of rolled seasons ending at `seasonId`.
 *   Walk backward from `seasonId`, matching the tail of rolledSeasons; for any
 *   gaps, push to `missing` and do NOT advance the rolled pointer.
 */
export function isSessionChronologyValid(
  meta: MetaData,
  seasonId: string,
): { valid: boolean; missing: string[] } {
  const rolled = (meta.rolledSeasons ?? []).map(normalizeSeasonId);
  const target = normalizeSeasonId(seasonId);

  if (rolled.length === 0) {
    return { valid: true, missing: [] };
  }

  let idx = rolled.length - 1; // pointer into rolledSeasons (tail → head)
  let cursor: string = target; // walk backward from target
  const missing: string[] = [];

  while (idx >= 0) {
    const want = cursor;
    const have = rolled[idx];

    if (have === want) {
      // matched this step → advance both
      idx -= 1;
      cursor = prevSeasonId(cursor);
    } else {
      // gap detected → record missing, only move cursor back
      missing.push(want);
      cursor = prevSeasonId(cursor);
      // DO NOT decrement idx here
    }
  }

  // We’ve walked back to the head of rolledSeasons.
  const valid = missing.length === 0;
  return { valid, missing };
}

export function isSessionFile(filePath: string): boolean {
  const dir = path.basename(path.dirname(filePath));
  const base = path.basename(filePath);
  return (
    dir === 'sessions' &&
    /^session_\d+[a-z]?_\d{4}-\d{2}-\d{2}.*\.jsonl$/i.test(base)
  );
}

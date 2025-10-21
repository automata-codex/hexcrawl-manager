import { normalizeSeasonId, prevSeasonId } from '@skyreach/core';
import { MetaV2Data } from '@skyreach/schemas';
import path from 'node:path';

import { getNextUnrolledSeason } from './files';
import { SESSION_FILE_RE } from '@skyreach/data';

export function isRolloverAlreadyApplied(
  meta: MetaV2Data,
  fileId: string,
): boolean {
  return meta.state.trails.applied?.appliedSessions?.includes(fileId) ?? false;
}

export function isRolloverChronologyValid(
  meta: MetaV2Data,
  seasonId: string,
): { valid: boolean; expected: string } {
  const expected = getNextUnrolledSeason(meta);
  // If nothing has been rolled yet, allow any first rollover.
  if (!expected) {
    return { valid: true, expected: '' };
  }

  // Only allow rollover for the next unapplied season
  const valid = normalizeSeasonId(seasonId) === normalizeSeasonId(expected);
  return { valid, expected: expected || '' };
}

export function isSessionAlreadyApplied(
  meta: MetaV2Data,
  fileId: string,
): boolean {
  return meta.state.trails.applied?.appliedSessions?.includes(fileId) ?? false;
}

/**
 * Check chronology against meta.rolledSeasons.
 * - If rolledSeasons is empty => valid, no missing.
 * - Otherwise, require a contiguous run of rolled seasons ending at `seasonId`.
 *   Walk backward from `seasonId`, matching the tail of rolledSeasons; for any
 *   gaps, push to `missing` and do NOT advance the rolled pointer.
 */
export function isSessionChronologyValid(
  meta: MetaV2Data,
  seasonId: string,
): { valid: boolean; missing: string[] } {
  const rolledSeasons = meta.state.trails.applied?.rolledSeasons ?? [];
  const rolled = rolledSeasons.map(normalizeSeasonId);
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
    SESSION_FILE_RE.test(base)
  );
}

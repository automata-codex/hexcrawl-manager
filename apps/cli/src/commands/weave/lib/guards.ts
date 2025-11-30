import { normalizeSeasonId, prevSeasonId } from '@skyreach/core';
import { parseRolloverFilename, SESSION_FILE_RE } from '@skyreach/data';
import { MetaV2Data } from '@skyreach/schemas';
import path from 'node:path';

import { getNextUnrolledSeason } from './files';

export function isRolloverAlreadyApplied(
  meta: MetaV2Data,
  fileId: string,
): boolean {
  // Extract seasonId from rollover filename (e.g., "rollover_1512-winter.jsonl" -> "1512-winter")
  const parsed = parseRolloverFilename(fileId);
  if (!parsed) {
    // If it doesn't match rollover pattern, fall back to checking sessions list
    return meta.state.trails.applied?.sessions?.includes(fileId) ?? false;
  }
  const appliedSeasons = (meta.state.trails.applied?.seasons ?? []).map(
    normalizeSeasonId,
  );
  return appliedSeasons.includes(normalizeSeasonId(parsed.seasonId));
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
  return meta.state.trails.applied?.sessions?.includes(fileId) ?? false;
}

/**
 * Check chronology against meta.state.trails.applied.seasons.
 * - If seasons is empty => valid, no missing.
 * - Otherwise, require a contiguous run of rolled seasons ending at `seasonId`.
 *   Walk backward from `seasonId`, matching the tail of seasons; for any
 *   gaps, push to `missing` and do NOT advance the rolled pointer.
 */
export function isSessionChronologyValid(
  meta: MetaV2Data,
  seasonId: string,
): { valid: boolean; missing: string[] } {
  const seasons = meta.state.trails.applied?.seasons ?? [];
  const rolled = seasons.map(normalizeSeasonId);
  const target = normalizeSeasonId(seasonId);

  if (rolled.length === 0) {
    return { valid: true, missing: [] };
  }

  let idx = rolled.length - 1; // pointer into seasons (tail → head)
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

  // We've walked back to the head of seasons.
  const valid = missing.length === 0;
  return { valid, missing };
}

export function isSessionFile(filePath: string): boolean {
  const dir = path.basename(path.dirname(filePath));
  const base = path.basename(filePath);
  return dir === 'sessions' && SESSION_FILE_RE.test(base);
}

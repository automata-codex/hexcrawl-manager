import {
  SESSION_ID_RE,
  SessionIdError,
  assertSeasonId,
  isSeasonId,
  isSessionId,
} from '@skyreach/core';
import {
  REPO_PATHS,
  SESSION_FILE_RE,
  buildRolloverFilename,
  checkFileExists,
  seasonOfSessionFile,
} from '@skyreach/data';
import fs from 'fs';
import path from 'path';

import { resolveTrailsSweep } from './resolve-trails-sweep';

export type TrailsWorkItem =
  | { kind: 'rollover'; file: string; seasonId: string }
  | {
      kind: 'session';
      file: string;
      sessionId: string;
      seasonId: string;
      date: string;
      part?: string;
    };

/** List all session files for a given numeric session (e.g. "0001"), sorted by date then part (a,b,c...). */
function listSessionFilesByNumber(
  sessionNum: string,
): Array<{ file: string; date: string; part?: string }> {
  const dir = REPO_PATHS.SESSIONS();
  return fs
    .readdirSync(dir)
    .map((f) => ({ f, m: f.match(SESSION_FILE_RE) }))
    .filter((x) => x.m && x.m[1] === sessionNum)
    .map((x) => ({
      file: path.join(dir, x.f),
      date: x.m![3], // YYYY-MM-DD (group 3)
      part: x.m![2]?.toLowerCase(), // optional a/b/c (group 2)
    }))
    .sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      // order a,b,c…; files without a part sort BEFORE 'a' (0 < 'a'.charCodeAt(0))
      const ai = a.part ? a.part.charCodeAt(0) : 0;
      const bi = b.part ? b.part.charCodeAt(0) : 0;
      return ai - bi;
    });
}

function resolveSessionTarget(sessionId: string): TrailsWorkItem[] {
  const m = sessionId.match(SESSION_ID_RE);
  if (m) {
    const num = m[1]; // "0001"
    const files = listSessionFilesByNumber(num);
    if (files.length === 0) {
      throw new Error(`No finalized logs for session-${num}`);
    }

    // decorate with season ids
    const sessions: TrailsWorkItem[] = files.map(({ file, date, part }) => ({
      kind: 'session' as const,
      file,
      sessionId: `session-${num}`,
      seasonId: seasonOfSessionFile(file),
      date,
      part,
    }));

    // interleave rollovers whenever the season changes between consecutive sessions
    const out: TrailsWorkItem[] = [];
    for (let i = 0; i < sessions.length; i++) {
      out.push(sessions[i]);
      const next = sessions[i + 1];
      if (!next) break;
      const currSeason = sessions[i].seasonId;
      const nextSeason = next.seasonId;
      if (nextSeason !== currSeason) {
        out.push({
          kind: 'rollover',
          file: rolloverFileFor(currSeason),
          seasonId: currSeason,
        });
      }
    }
    return out;
  }
  throw new SessionIdError(sessionId);
}

function rolloverFileFor(seasonId: string): string {
  const file = path.join(REPO_PATHS.ROLLOVERS(), buildRolloverFilename(seasonId));
  return checkFileExists(
    file,
    `Rollover file not found for ${seasonId}: ${path.basename(file)}`,
  );
}

/**
 * Resolve a target into an ordered list of trails work items.
 * - session-0001  => [ S(…a), R(currSeason if next changes), S(…b), R(next change), S(…c) ]
 * - 1511-autumn   => [ R(autumn) ]
 *
 * NOTE: This resolver expects a defined target. For a "sweep all" (no target) path,
 * use a separate discovery function that lists all unapplied items in world order.
 */
export function resolveTrailsTarget(
  target: string | undefined,
): TrailsWorkItem[] {
  if (!target) {
    return resolveTrailsSweep();
  }

  // session id → interleaved sessions with rollovers inserted at season boundaries
  if (isSessionId(target)) {
    return resolveSessionTarget(target);
  }

  // season id (single rollover)
  if (isSeasonId(target)) {
    const seasonId = assertSeasonId(target);
    return [{ kind: 'rollover', file: rolloverFileFor(seasonId), seasonId }];
  }

  // As of now, we do not treat arbitrary file paths as targets in this resolver.
  throw new Error(
    `Invalid target "${target}": must be a session ID (e.g. session-0042) or season ID (e.g. 1511-autumn).`,
  );
}

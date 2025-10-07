import { normalizeSeasonId } from '@skyreach/core';
import {
  REPO_PATHS,
  SESSION_FILE_RE,
  ROLLOVER_FILE_RE,
  seasonOfSessionFile,
  loadMeta,
} from '@skyreach/data';
import fs from 'fs';
import path from 'path';

import {
  isSessionAlreadyApplied,
  isRolloverAlreadyApplied,
} from './guards';
import { TrailsWorkItem } from './resolve-trails-target';

/** Internal shape while discovering session files. */
type FoundSession = {
  file: string;
  base: string;
  sessionNum: string;
  date: string;     // YYYY-MM-DD
  part?: string;    // a/b/c
  seasonId: string; // normalized
};

/** Internal shape for rollover files on disk. */
type FoundRollover = {
  file: string;
  base: string;
  seasonId: string; // normalized
};

/** Discover all finalized session logs, with parsed parts. */
function findSessionLogs(): FoundSession[] {
  const dir = REPO_PATHS.SESSIONS();
  if (!fs.existsSync(dir)) return [];
  const out: FoundSession[] = [];

  for (const base of fs.readdirSync(dir)) {
    const m = base.match(SESSION_FILE_RE);
    if (!m) continue;
    const sessionNum = m[1];
    const part = m[2]?.toLowerCase();
    const date = m[3];
    const file = path.join(dir, base);
    out.push({
      file,
      base,
      sessionNum,
      date,
      part,
      seasonId: seasonOfSessionFile(file),
    });
  }

  // Sort by date asc, then part (undefined before 'a')
  out.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    const ai = a.part ? a.part.charCodeAt(0) : 0;
    const bi = b.part ? b.part.charCodeAt(0) : 0;
    return ai - bi;
  });

  return out;
}

/** Discover all rollover files on disk (both hyphen/underscore tolerated via regex). */
function findRolloverFiles(): FoundRollover[] {
  const dir = REPO_PATHS.SESSIONS();
  if (!fs.existsSync(dir)) return [];
  const out: FoundRollover[] = [];

  for (const base of fs.readdirSync(dir)) {
    const m = base.match(ROLLOVER_FILE_RE);
    if (!m) continue;
    const seasonId = normalizeSeasonId(`${m[1]}-${m[2].toLowerCase()}`);
    const file = path.join(dir, base);
    out.push({ file, base, seasonId });
  }

  // Sort by seasonId lexical (YYYY-season) which corresponds to year then season
  out.sort((a, b) => a.seasonId.localeCompare(b.seasonId));
  return out;
}

/**
 * Sweep resolver: when no specific target is provided, return all *unapplied* items
 * (sessions and rollovers) in world order.
 *
 * World order heuristic:
 *  - Iterate session logs by date (and a/b/c part).
 *  - Insert a rollover *after the last session in a season* if an unapplied rollover file exists.
 *  - After processing all sessions, append any remaining unapplied standalone rollovers
 *    (seasons that had no sessions since last apply), ordered by seasonId.
 *
 * Guards such as chronology are still enforced by the apply step; this resolver focuses on ordering.
 */
export function resolveTrailsSweep(): TrailsWorkItem[] {
  const meta = loadMeta();
  const sessionsAll = findSessionLogs();
  const rolloversAll = findRolloverFiles();

  // Filter out already-applied
  const sessions = sessionsAll.filter((s) => !isSessionAlreadyApplied(meta, s.base));
  const rolloverMap = new Map<string, FoundRollover>();
  for (const r of rolloversAll) {
    if (!isRolloverAlreadyApplied(meta, r.base)) {
      rolloverMap.set(r.seasonId, r);
    }
  }

  const out: TrailsWorkItem[] = [];

  // Interleave: for each season run in sessions, append its rollover afterward (if unapplied)
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    out.push({
      kind: 'session',
      file: s.file,
      sessionId: `session-${s.sessionNum}`,
      seasonId: s.seasonId,
      date: s.date,
      part: s.part,
    });

    const next = sessions[i + 1];
    const seasonEndsHere = !next || next.seasonId !== s.seasonId;
    if (seasonEndsHere) {
      const r = rolloverMap.get(s.seasonId);
      if (r) {
        out.push({ kind: 'rollover', file: r.file, seasonId: r.seasonId });
        rolloverMap.delete(s.seasonId);
      }
    }
  }

  // Append any remaining standalone rollovers (no recent sessions for those seasons)
  // These are returned in ascending seasonId order.
  for (const r of Array.from(rolloverMap.values()).sort((a, b) => a.seasonId.localeCompare(b.seasonId))) {
    out.push({ kind: 'rollover', file: r.file, seasonId: r.seasonId });
  }

  return out;
}

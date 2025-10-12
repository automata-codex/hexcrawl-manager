import {
  RolloverInfo,
  discoverFinalizedLogs,
  discoverRolloverFiles,
  enrichLogsWithSeason,
  loadMeta,
} from '@skyreach/data';

import {
  isRolloverAlreadyApplied,
  isSessionAlreadyApplied,
} from '../guards';
import { TrailsWorkItem } from './resolve-trails-target';

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
  const sessionsAll = enrichLogsWithSeason(discoverFinalizedLogs());
  const rolloversAll = discoverRolloverFiles();

  // Filter out already-applied
  const sessions = sessionsAll.filter((s) => !isSessionAlreadyApplied(meta, s.filename));
  const rolloverMap = new Map<string, RolloverInfo>();
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
      file: s.fullPath,
      sessionId: `session-${s.sessionNumber}`,
      seasonId: s.seasonId,
      date: s.date,
      part: s.suffix,
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

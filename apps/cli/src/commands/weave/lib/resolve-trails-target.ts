import { REPO_PATHS } from '@skyreach/data';
import fs from 'fs';
import path from 'path';

import { readEvents } from '../../../services/event-log.service';

import { deriveSeasonId, normalizeSeasonId } from './season';

import type { CampaignDate } from '@skyreach/schemas';

export type TrailsWorkItem =
  | { kind: 'rollover'; file: string; seasonId: string }
  | { kind: 'session';  file: string; sessionId: string; seasonId: string; date: string; part?: string };

const SESSION_ID_RE   = /^session-(\d{4})$/i;
// session_0001_2025-10-01.jsonl
// session_0001a_2025-10-01.jsonl (optional a/b/c suffix)
const SESSION_FILE_RE = /^session_(\d{4})([a-z])?_(\d{4}-\d{2}-\d{2})\.jsonl$/i;
const SEASON_FILE = (seasonId: string) => `rollover_${seasonId}.jsonl`;

function ensureExists(file: string, msg?: string) {
  if (!fs.existsSync(file)) {
    throw new Error(msg ?? `File not found: ${file}`);
  }
  return file;
}

function listSessionFilesByNumber(sessionNum: string): Array<{ file: string; date: string; part?: string }> {
  const dir = REPO_PATHS.SESSIONS();
  return fs.readdirSync(dir)
    .map((f) => ({ f, m: f.match(SESSION_FILE_RE) }))
    .filter((x) => x.m && x.m[1] === sessionNum)
    .map((x) => ({
      file: path.join(dir, x.f),
      date: x.m![2],           // YYYY-MM-DD
      part: x.m![3]?.toLowerCase(), // a/b/c ...
    }))
    .sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      // order a,b,c…; files without a part sort BEFORE 'a' (adjust if you prefer after)
      const ai = a.part ? a.part.charCodeAt(0) : 0;
      const bi = b.part ? b.part.charCodeAt(0) : 0;
      return ai - bi;
    });
}

function seasonOfSessionFile(sessionFile: string): string {
  const events = readEvents(sessionFile);
  const dayStart = events.find((e) => e.kind === 'day_start');
  if (!dayStart) throw new Error(`No day_start in ${path.basename(sessionFile)}; cannot derive season.`);
  const calDate = dayStart.payload?.calendarDate as CampaignDate;
  return normalizeSeasonId(deriveSeasonId(calDate));
}

function rolloverFileFor(seasonId: string): string {
  const file = path.join(REPO_PATHS.SESSIONS(), SEASON_FILE(seasonId));
  return ensureExists(file, `Rollover file not found for ${seasonId}: ${path.basename(file)}`);
}

/**
 * session-0001  => [ S(…a), R(autumn), S(…b), R(winter), S(…c) ]
 * 1511-autumn   => [ R(autumn) ]
 * /path/foo.jsonl => [ that file only ]  (applyTrails will detect kind)
 */
export function resolveTrailsTarget(raw: string): TrailsWorkItem[] {
  const m = raw.match(SESSION_ID_RE);
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

  // season id (single rollover)
  if (/^\d{4}-(spring|summer|autumn|winter)$/i.test(raw)) {
    const seasonId = raw.toLowerCase();
    return [{ kind: 'rollover', file: rolloverFileFor(seasonId), seasonId }];
  }

  // treat as a file path (absolute or relative)
  const file = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  ensureExists(file);
  // Let applyTrails figure out whether it's a session or rollover
  return [{ kind: 'session', file, sessionId: path.basename(file, '.jsonl'), seasonId: '', date: '' }];
}

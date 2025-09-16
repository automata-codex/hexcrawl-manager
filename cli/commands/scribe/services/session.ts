import path from 'node:path';
import { existsSync, readdirSync, statSync } from 'node:fs';
import fs from 'node:fs';
import yaml from 'yaml';
import { getRepoPath } from '../../../../lib/repo';
import {
  inProgressDir,
  inProgressPath,
  sessionsDir,
} from '../lib/session-files';
import { type Event } from '../types';
import { readEvents, writeEvents, timeNowISO } from './event-log';

export const inProgressPathFor = (id: string) => inProgressPath(id);
export const sessionsDirPath = () => sessionsDir();

/** Finalizes an in-progress file and writes the canonical session file. Returns output path. */
export function finalizeSession(sessionId: string, inProgressFile: string) {
  const rawEvents = readEvents(inProgressFile);
  if (!rawEvents.find(e => e.kind === 'session_end')) {
    rawEvents.push({
      seq: (rawEvents.at(-1)?.seq ?? 0) + 1,
      ts: timeNowISO(),
      kind: 'session_end',
      payload: { status: 'final' }
    });
  }
  // Attach original index for fallback
  const evs = rawEvents.map((e, i) => ({
    ...e,
    _origIdx: i,
  }));

  evs.sort((a, b) => {
    // Primary: ts ascending
    if (a.ts && b.ts) {
      const tsCmp = a.ts.localeCompare(b.ts);
      if (tsCmp !== 0) return tsCmp;
    } else if (a.ts && !b.ts) {
      return -1;
    } else if (!a.ts && b.ts) {
      return 1;
    }

    // Secondary: seq ascending
    const aSeq = typeof a.seq === 'number' ? a.seq : Number.POSITIVE_INFINITY;
    const bSeq = typeof b.seq === 'number' ? b.seq : Number.POSITIVE_INFINITY;
    if (aSeq !== bSeq) {
      return aSeq - bSeq;
    }

    // Fallback: original file order
    return (a._origIdx ?? 0) - (b._origIdx ?? 0);
  });

  // Remove _origIdx after sorting
  const outputEvents = evs.map((e, i) => {
    const event: Event & { _origIdx?: number } = { ...e };
    delete event._origIdx;
    event.seq = i + 1;
    return event;
  });

  const out = path.join(sessionsDirPath(), `${sessionId}.jsonl`);
  writeEvents(out, outputEvents);
  return out;
}

/** Latest in-progress file by mtime, or null if none. */
export function findLatestInProgress(): { id: string; path: string } | null {
  const dir = inProgressDir();
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter(f => f.endsWith('.jsonl'));
  if (!files.length) return null;
  const withStats = files
    .map(f => ({ f, p: path.join(dir, f), s: statSync(path.join(dir, f)) }))
    .sort((a, b) => b.s.mtimeMs - a.s.mtimeMs);
  const top = withStats[0];
  return { id: top.f.replace(/\.jsonl$/, ''), path: top.p };
}

// Discriminated union for prepareSessionStart return value
export type SessionStartPrep =
  | { ok: false; error: string }
  | {
      ok: true;
      sessionId: string;
      inProgressFile: string;
      lockFile?: string;
      seq?: number;
      dev?: boolean;
    };

/**
 * Prepares session start: generates sessionId, file paths, and handles
 * lock/meta logic. Returns a discriminated union: `{ ok: false, error }` or
 * `{ ok: true, sessionId, inProgressFile, ... }`.
 */
export function prepareSessionStart({
  devMode,
  date,
}: {
  devMode: boolean;
  date: Date;
}): SessionStartPrep {
  const metaPath = getRepoPath('data', 'meta.yaml');
  const locksDir = getRepoPath('data', 'session-logs', '.locks');
  const inProgressDirProd = getRepoPath('data', 'session-logs', 'in-progress');
  const inProgressDirDev = getRepoPath('data', 'session-logs', '_dev');
  const pad = (n: number, len = 4) => n.toString().padStart(len, '0');

  if (devMode) {
    const iso = date.toISOString().replace(/[:.]/g, '-');
    const sessionId = `dev_${iso}`;
    const inProgressFile = path.join(inProgressDirDev, `${sessionId}.jsonl`);
    return { ok: true, sessionId, inProgressFile, dev: true };
  }

  // Production mode
  if (!fs.existsSync(metaPath)) {
    return { ok: false, error: `❌ Missing meta file at ${metaPath}` };
  }
  const metaRaw = fs.readFileSync(metaPath, 'utf8');
  const meta = yaml.parse(metaRaw) || {};
  const seq = meta.nextSessionSeq;
  if (!seq || typeof seq !== 'number') {
    return { ok: false, error: '❌ Invalid or missing nextSessionSeq in meta.yaml' };
  }
  const ymd = date.toISOString().slice(0, 10);
  const sessionId = `session_${pad(seq)}_${ymd}`;
  const inProgressFile = path.join(inProgressDirProd, `${sessionId}.jsonl`);
  const lockFile = path.join(locksDir, `session_${pad(seq)}.lock`);

  // Check for lock conflict
  if (fs.existsSync(lockFile)) {
    return { ok: false, error: `❌ Lock file exists for session sequence ${seq} (${lockFile}). Another session may be active.` };
  }

  // Create lock file
  const lockData = {
    seq,
    filename: `${sessionId}.jsonl`,
    createdAt: date.toISOString(),
    pid: process.pid,
  };
  fs.mkdirSync(locksDir, { recursive: true });
  fs.writeFileSync(lockFile, yaml.stringify(lockData), { flag: 'wx' });

  return { ok: true, sessionId, inProgressFile, lockFile, seq };
}

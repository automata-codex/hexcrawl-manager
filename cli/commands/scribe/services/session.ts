import path from 'node:path';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { inProgressDir, sessionsDir, inProgressPath } from '../lib/session-files';
import { readEvents, writeEvents, timeNowISO } from './event-log';

export const inProgressPathFor = (id: string) => inProgressPath(id);
export const sessionsDirPath = () => sessionsDir();

/** Finalizes an in-progress file and writes the canonical session file. Returns output path. */
export function finalizeSession(sessionId: string, inProgressFile: string) {
  const evs = readEvents(inProgressFile);
  if (!evs.find(e => e.kind === 'session_end')) {
    evs.push({
      seq: (evs.at(-1)?.seq ?? 0) + 1,
      ts: timeNowISO(),
      kind: 'session_end',
      payload: { status: 'final' }
    });
  }
  evs.sort((a,b)=> a.ts.localeCompare(b.ts));
  evs.forEach((e,i)=> e.seq = i+1);

  const out = path.join(sessionsDirPath(), `${sessionId}.jsonl`);
  writeEvents(out, evs);
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

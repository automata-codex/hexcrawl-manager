import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { inProgressDir } from './lib/session-files.ts';

export function findLatestInProgress(): { id: string; path: string } | null {
  const dir = inProgressDir();
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter(f => f.endsWith('.jsonl'));
  if (!files.length) return null;
  const withStats = files
    .map(f => ({ f, p: path.join(dir, f), s: statSync(path.join(dir, f)) }))
    .sort((a, b) => b.s.mtimeMs - a.s.mtimeMs);
  const top = withStats[0];
  const id = top.f.replace(/\.jsonl$/, '');
  return { id, path: top.p };
}

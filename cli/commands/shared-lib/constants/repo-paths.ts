import path from 'path';
import fs from 'fs';
import { getRepoPath } from '../../../../lib/repo';

export const REPO_PATHS = {
  CHARACTERS: getRepoPath('data', 'characters'),
  DEV: getRepoPath('data', 'session-logs', '_dev'), // Dev-mode root
  DEV_IN_PROGRESS: getRepoPath('data', 'session-logs', '_dev', 'in-progress'), // Dev-mode in-progress logs (see session.ts, inProgressPathFor)
  DEV_ROLLOVERS: getRepoPath('data', 'session-logs', '_dev', 'rollovers'), // Dev-mode rollover logs (see session.ts, inProgressPathFor)
  DEV_SESSIONS: getRepoPath('data', 'session-logs', '_dev', 'sessions'), // Dev-mode finalized session logs (see session.ts, inProgressPathFor)
  FOOTPRINTS: getRepoPath('data', 'session-logs', 'footprints'), // Footprint logs (see tests, session log output)
  HAVENS: getRepoPath('data', 'havens.yml'), // Havens list (see weave commands, tests)
  IN_PROGRESS: getRepoPath('data', 'session-logs', 'in-progress'), // In-progress session logs (see session.ts, findLatestInProgress, prepareSessionStart)
  LOCKS: getRepoPath('data', 'session-logs', '.locks'), // Lock files for sessions (see session.ts, prepareSessionStart, finalizeSession)
  LOGS_ROOT: getRepoPath('data', 'session-logs'), // Root for all session logs (see event-log.ts, session.ts)
  META: getRepoPath('data', 'meta.yaml'), // Meta file for session state (see session.ts, prepareSessionStart, finalizeSession)
  ROLLOVERS: getRepoPath('data', 'session-logs', 'rollovers'), // Session rollover files (see session.ts, finalize logic)
  SESSIONS: getRepoPath('data', 'session-logs', 'sessions'), // Finalized session files (see session.ts, tests, scribe commands)
  TRAILS: getRepoPath('data', 'trails.yaml'), // Trails data (see session seeding, tests)
};

export function ensureRepoDirs() {
  for (const key in REPO_PATHS) {
    const p = REPO_PATHS[key as keyof typeof REPO_PATHS];
    const dir = path.extname(p) ? path.dirname(p) : p;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

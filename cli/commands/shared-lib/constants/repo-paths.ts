import fs from 'fs';
import path from 'path';

import { getRepoPath } from '../../../../lib/repo';

export const REPO_PATHS = {
  CHARACTERS: () => getRepoPath('data', 'characters'),
  DEV: () => getRepoPath('data', 'session-logs', '_dev'), // Dev-mode root
  DEV_IN_PROGRESS: () =>
    getRepoPath('data', 'session-logs', '_dev', 'in-progress'), // Dev-mode in-progress logs
  DEV_ROLLOVERS: () => getRepoPath('data', 'session-logs', '_dev', 'rollovers'), // Dev-mode rollover logs
  DEV_SESSIONS: () => getRepoPath('data', 'session-logs', '_dev', 'sessions'), // Dev-mode finalized session logs
  FOOTPRINTS: () => getRepoPath('data', 'session-logs', 'footprints'), // Footprint logs
  HAVENS: () => getRepoPath('data', 'havens.yml'),
  IN_PROGRESS: () => getRepoPath('data', 'session-logs', 'in-progress'), // In-progress session logs
  LOCKS: () => getRepoPath('data', 'session-logs', '.locks'), // Lock files for sessions
  LOGS_ROOT: () => getRepoPath('data', 'session-logs'), // Root for all session logs
  META: () => getRepoPath('data', 'meta.yaml'), // Meta file for session state
  REPORTS: () => getRepoPath('data', 'session-logs', 'reports'), // Generated reports
  ROLLOVERS: () => getRepoPath('data', 'session-logs', 'rollovers'), // Root for all session logs
  SESSIONS: () => getRepoPath('data', 'session-logs', 'sessions'), // Finalized session files
  TRAILS: () => getRepoPath('data', 'trails.yml'),
};

export function ensureRepoDirs() {
  for (const key in REPO_PATHS) {
    const p = REPO_PATHS[key as keyof typeof REPO_PATHS]();
    const dir = path.extname(p) ? path.dirname(p) : p;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

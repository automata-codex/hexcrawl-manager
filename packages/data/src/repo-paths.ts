import fs from 'fs';
import path from 'path';

import { getRepoPath, resolveDataPath } from './paths';

export const REPO_PATHS = {
  AP_LEDGER: () => resolveDataPath('ap-ledger.jsonl'),
  CHARACTERS: () => getRepoPath('data', 'characters'),
  CLUE_LINKS: () => resolveDataPath('clue-links.yaml'),
  DEV: () => getRepoPath('data', 'session-logs', '_dev'), // Dev-mode root
  DEV_IN_PROGRESS: () =>
    getRepoPath('data', 'session-logs', '_dev', 'in-progress'), // Dev-mode in-progress logs
  DEV_ROLLOVERS: () => getRepoPath('data', 'session-logs', '_dev', 'rollovers'), // Dev-mode rollover logs
  DEV_SESSIONS: () => getRepoPath('data', 'session-logs', '_dev', 'sessions'), // Dev-mode finalized session logs
  FAST_TRAVEL: () => getRepoPath('data', 'fast-travel'), // Fast travel plan files
  FOOTPRINTS: (domain?: string) =>
    domain
      ? getRepoPath('data', 'session-logs', 'footprints', domain)
      : getRepoPath('data', 'session-logs', 'footprints'), // Footprint logs (optionally by domain)
  HAVENS: () => getRepoPath('data', 'havens.yml'),
  HEXES: () => resolveDataPath('hexes'),
  IN_PROGRESS: () => getRepoPath('data', 'session-logs', 'in-progress'), // In-progress session logs
  KNOWLEDGE_TREES: () => resolveDataPath('knowledge-trees'),
  LOCKS: () => getRepoPath('data', 'session-logs', '.locks'), // Lock files for sessions
  LOGS_ROOT: () => getRepoPath('data', 'session-logs'), // Root for all session logs
  META: () => getRepoPath('data', 'meta.yaml'), // Meta file for session state
  REPORTS: () => getRepoPath('data', 'session-reports'), // Generated reports
  ROLLOVERS: () => getRepoPath('data', 'session-logs', 'rollovers'), // Root for all session logs
  SESSIONS: () => getRepoPath('data', 'session-logs', 'sessions'), // Finalized session files
  TEMPLATES: () => getRepoPath('data', 'templates'), // Template files (e.g., post-session checklist)
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

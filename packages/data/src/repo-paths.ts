import fs from 'fs';
import path from 'path';

import { resolveDataPath } from './paths.js';

export const REPO_PATHS = {
  AP_LEDGER: () => resolveDataPath('ap-ledger.jsonl'),
  CHARACTERS: () => resolveDataPath('characters'),
  DEV: () => resolveDataPath('session-logs/_dev'), // Dev-mode root
  DEV_IN_PROGRESS: () => resolveDataPath('session-logs/_dev/in-progress'), // Dev-mode in-progress logs
  DEV_ROLLOVERS: () => resolveDataPath('session-logs/_dev/rollovers'), // Dev-mode rollover logs
  DEV_SESSIONS: () => resolveDataPath('session-logs/_dev/sessions'), // Dev-mode finalized session logs
  FAST_TRAVEL: () => resolveDataPath('fast-travel'), // Fast travel plan files
  FOOTPRINTS: (domain?: string) =>
    domain
      ? resolveDataPath(`session-logs/footprints/${domain}`)
      : resolveDataPath('session-logs/footprints'), // Footprint logs (optionally by domain)
  HAVENS: () => resolveDataPath('havens.yml'),
  HEXES: () => resolveDataPath('hexes'),
  IN_PROGRESS: () => resolveDataPath('session-logs/in-progress'), // In-progress session logs
  LOCKS: () => resolveDataPath('session-logs/.locks'), // Lock files for sessions
  LOGS_ROOT: () => resolveDataPath('session-logs'), // Root for all session logs
  META: () => resolveDataPath('meta.yaml'), // Meta file for session state
  REPORTS: () => resolveDataPath('session-reports'), // Generated reports
  ROLLOVERS: () => resolveDataPath('session-logs/rollovers'), // Root for all session logs
  SESSIONS: () => resolveDataPath('session-logs/sessions'), // Finalized session files
  TEMPLATES: () => resolveDataPath('templates'), // Template files (e.g., post-session checklist)
  TRAILS: () => resolveDataPath('trails.yml'),
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

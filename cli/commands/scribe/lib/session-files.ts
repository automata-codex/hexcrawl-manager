import fs from 'node:fs';
import path from 'node:path';
import { getRepoPath } from '../../../../lib/repo/get-repo-path.ts';

export function ensureLogs() {
  fs.mkdirSync(inProgressDir(), { recursive: true });
  fs.mkdirSync(sessionsDir(), { recursive: true });
}

export function inProgressDir() {
  return getRepoPath('data', 'session-logs', 'in-progress');       // data/session-logs/in-progress
}

export function inProgressPath(sessionId: string) {
  return path.join(inProgressDir(), `${sessionId}.jsonl`);
}

export function logsRoot() {
  return getRepoPath('data', 'session-logs');                      // e.g. /abs/path/to/repo/data/session-logs
}

export function sessionPath(sessionId: string) {
  return path.join(sessionsDir(), `${sessionId}.jsonl`);
}

export function sessionsDir() {
  return getRepoPath('data', 'session-logs', 'sessions');          // data/session-logs/sessions
}

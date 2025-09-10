import fs from 'node:fs';
import path from 'node:path';
import { getRepoPath } from './config'; // ← use your existing helper

export function logsRoot() {
  return getRepoPath('data', 'session-logs');                      // e.g. /abs/path/to/repo/data/session-logs
}
export function inProgressDir() {
  return getRepoPath('data', 'session-logs', 'in-progress');       // data/session-logs/in-progress
}
export function sessionsDir() {
  return getRepoPath('data', 'session-logs', 'sessions');          // data/session-logs/sessions
}
export function inProgressPath(sessionId: string) {
  return path.join(inProgressDir(), `${sessionId}.jsonl`);
}
export function sessionPath(sessionId: string) {
  return path.join(sessionsDir(), `${sessionId}.jsonl`);
}
export function ensureLogs() {
  fs.mkdirSync(inProgressDir(), { recursive: true });
  fs.mkdirSync(sessionsDir(), { recursive: true });
}

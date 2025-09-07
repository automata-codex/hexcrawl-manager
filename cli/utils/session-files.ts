import fs from 'node:fs';
import path from 'node:path';
import { getRepoPath } from './config'; // ← use your existing helper

export function logsRoot() {
  return getRepoPath('logs');                      // e.g. /abs/path/to/repo/logs
}
export function inprogressDir() {
  return getRepoPath('logs', 'inprogress');        // /repo/logs/inprogress
}
export function sessionsDir() {
  return getRepoPath('logs', 'sessions');          // /repo/logs/sessions
}
export function inprogressPath(sessionId: string) {
  return path.join(inprogressDir(), `${sessionId}.jsonl`);
}
export function sessionPath(sessionId: string) {
  return path.join(sessionsDir(), `${sessionId}.jsonl`);
}
export function ensureLogs() {
  fs.mkdirSync(inprogressDir(), { recursive: true });
  fs.mkdirSync(sessionsDir(), { recursive: true });
}

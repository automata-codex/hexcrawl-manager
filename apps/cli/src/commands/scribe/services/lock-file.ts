import { REPO_PATHS } from '@skyreach/data';
import { SessionId } from '@skyreach/schemas';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

export interface LockData {
  seq: number;
  filename: string;
  createdAt: string; // ISO 8601
  pid: number;
}

export function getLockFilePath(sessionId: SessionId): string {
  return path.join(REPO_PATHS.LOCKS(), `${sessionId}.lock`);
}

export function lockExists(sessionId: SessionId): boolean {
  return fs.existsSync(getLockFilePath(sessionId));
}

export function createLockFile(sessionId: SessionId, data: LockData): void {
  const filePath = getLockFilePath(sessionId);
  fs.writeFileSync(filePath, yaml.stringify(data), { flag: 'wx' });
}

export function removeLockFile(sessionId: SessionId): void {
  const filePath = getLockFilePath(sessionId);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function listLockFiles(): string[] {
  const dir = REPO_PATHS.LOCKS();
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir).filter((f) => f.endsWith('.lock'));
}

export function readLockFile(sessionId: SessionId): LockData | null {
  const filePath = getLockFilePath(sessionId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return yaml.parse(content);
}

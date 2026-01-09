import { SESSION_FILE_RE } from '@achm/data';
import fs from 'node:fs';
import path from 'node:path';

export function findSessionFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((f) => SESSION_FILE_RE.test(f))
    .map((f) => path.join(dir, f));
}

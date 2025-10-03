import fs from 'node:fs';
import path from 'node:path';

export function ensureDir(filename: string) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
}

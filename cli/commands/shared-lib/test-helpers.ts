import fs from 'node:fs';

export function readJsonl(file: string): any[] {
  const raw = fs.readFileSync(file, 'utf8');
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

import fs from 'node:fs';
import path from 'node:path';
import type { Event } from '../types';

export function readJsonl(p: string): Event[] {
  if (!fs.existsSync(p)) return [];
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean);
  return lines.map((l) => JSON.parse(l));
}

export function writeJsonl(p: string, records: Event[]) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const body = records.map((r) => JSON.stringify(r)).join('\n') + '\n';
  fs.writeFileSync(p, body, 'utf8');
}

export function appendJsonl(p: string, record: Event) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, JSON.stringify(record) + '\n', 'utf8');
}

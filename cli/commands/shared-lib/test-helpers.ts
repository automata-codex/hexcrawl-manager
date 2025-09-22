import fs from 'node:fs';
import path from 'node:path';

import { type Event } from '../scribe/types';

export function eventsOf(events: Event[], kind: string): Event[] {
  return events.filter((e) => e.kind === kind);
}

export function findSessionFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((f) => /^session_\d+[a-z]?_\d{4}-\d{2}-\d{2}\.jsonl$/i.test(f))
    .map((f) => path.join(dir, f));
}

export function readJsonl(file: string): any[] {
  const raw = fs.readFileSync(file, 'utf8');
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

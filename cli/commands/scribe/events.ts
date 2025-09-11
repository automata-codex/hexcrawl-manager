import { readJsonl, appendJsonl, type Event } from './lib/jsonl.ts';

export function appendEvent(filePath: string, kind: string, payload: Record<string, unknown>) {
  const evs = readJsonl(filePath);
  const rec: Event = { seq: nextSeq(evs), ts: nowISO(), kind, payload };
  appendJsonl(filePath, rec);
  return rec;
}

export function nextSeq(existing: Event[]) {
  return existing.length ? Math.max(...existing.map(e => e.seq)) + 1 : 1;
}

export function nowISO() { return new Date().toISOString(); }

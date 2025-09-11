import { HEX_RE } from './constants.ts';
import { readJsonl, type Event } from './lib/jsonl.ts';

export function deriveCurrentHex(filePath: string | null): string | null {
  if (!filePath) return null;
  const evs = readJsonl(filePath);
  const lastMove = [...evs].reverse().find(e => e.kind === 'move');
  if (lastMove?.payload && typeof lastMove.payload === 'object') {
    const to = (lastMove.payload as any).to;
    if (typeof to === 'string') {
      return normalizeHex(to);
    }
  }
  const start = evs.find(e => e.kind === 'session_start');
  if (start?.payload && typeof start.payload === 'object') {
    const hx = (start.payload as any).startHex;
    if (typeof hx === 'string') {
      return normalizeHex(hx);
    }
  }
  return null;
}

export function isHexId(id: string): boolean {
  return HEX_RE.test(id);
}

export function lastHexFromEvents(evs: Event[]) {
  const lastMove = [...evs].reverse().find(e => e.kind === 'move');
  if (lastMove?.payload && typeof lastMove.payload === 'object') {
    const to = (lastMove.payload as any).to;
    if (typeof to === 'string') {
      return normalizeHex(to);
    }
  }
  const start = evs.find(e => e.kind === 'session_start');
  if (start?.payload && typeof start.payload === 'object') {
    const hx = (start.payload as any).startHex;
    if (typeof hx === 'string') {
      return normalizeHex(hx);
    }
  }
  return null;
}

export function normalizeHex(h: string) {
  return h.trim().toUpperCase();
}

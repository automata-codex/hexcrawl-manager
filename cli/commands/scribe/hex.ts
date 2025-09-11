import { HEX_RE } from './constants.ts';

export function isHexId(id: string): boolean {
  return HEX_RE.test(id);
}

export function normalizeHex(h: string) {
  return h.trim().toUpperCase();
}

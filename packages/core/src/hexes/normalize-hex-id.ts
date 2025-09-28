/**
 * Normalizes a hex ID by trimming whitespace and converting to uppercase.
 * @param h
 */
export function normalizeHexId(h: string) {
  return h.trim().toUpperCase();
}

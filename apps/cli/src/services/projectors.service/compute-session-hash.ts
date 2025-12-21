import crypto from 'node:crypto';

import type { ScribeEvent } from '@achm/schemas';

/**
 * Compute a SHA-256 over the current ordered event list.
 * Returns "sha256:<hex>" for use in sidecars (e.g., fast travel `lastHash`).
 *
 * Assumes:
 * - `events` are already in log order (seq ascending).
 * - Each event is plain JSON-serializable.
 */
export function computeSessionHash(events: ScribeEvent[]): string {
  const payload = JSON.stringify(events);
  const hex = crypto.createHash('sha256').update(payload).digest('hex');
  return `sha256:${hex}`;
}

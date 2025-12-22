import { isValidHexId } from '../hexes/index.js';

import type { CoordinateNotation } from '../coordinates/index.js';

/**
 * Parses a trail ID into its constituent hex IDs.
 * @param trailId - Trail ID in format "hexA-hexB"
 * @param notation - Coordinate notation to use
 */
export function parseTrailId(
  trailId: string,
  notation: CoordinateNotation,
): {
  from: string;
  to: string;
} | null {
  const [from, to] = trailId.split('-');
  if (isValidHexId(from, notation) && isValidHexId(to, notation)) {
    return { from, to };
  }
  return null;
}

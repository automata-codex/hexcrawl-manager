import { isValidHexId } from '../hexes/index.js';

/**
 * Parses a trail ID into its constituent hex IDs.
 * @param trailId
 */
export function parseTrailId(trailId: string): {
  from: string;
  to: string;
} | null {
  const [from, to] = trailId.split('-');
  if (isValidHexId(from) && isValidHexId(to)) {
    return { from, to };
  }
  return null;
}

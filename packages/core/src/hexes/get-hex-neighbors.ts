import {
  formatHexId,
  getNeighborCoords,
  parseHexId,
  sortHexIds,
} from '../coordinates/index.js';

import type { CoordinateNotation } from '../coordinates/index.js';

/**
 * Get neighboring hexes for a given hex in a flat-topped hex grid.
 * Uses even-q offset with 0-indexed columns (A=0), where columns A, C, E... are shifted down.
 *
 * Note: This function filters out neighbors with negative coordinates (invalid hex IDs)
 * but does NOT enforce map boundaries. Callers should filter results against their
 * map configuration if needed.
 *
 * @param hex - Hex ID (e.g., "F12" for letter-number, "0612" for numeric)
 * @param notation - Coordinate notation to use
 * @returns Array of valid neighboring hex IDs, sorted
 */
export function getHexNeighbors(
  hex: string,
  notation: CoordinateNotation,
): string[] {
  const coord = parseHexId(hex, notation);
  const neighbors = getNeighborCoords(coord);

  // Filter out neighbors with negative coordinates (invalid hex IDs)
  // and format back to strings
  const validNeighbors = neighbors
    .filter((n) => n.col >= 0 && n.row >= 0)
    .map((n) => formatHexId(n, notation));

  return sortHexIds(validNeighbors, notation);
}

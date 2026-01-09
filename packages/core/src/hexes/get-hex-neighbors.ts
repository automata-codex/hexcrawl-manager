import {
  formatHexId,
  getNeighborCoords,
  isValidHex,
  parseHexId,
  sortHexIds,
} from '../coordinates/index.js';

import type { CoordinateNotation, MapConfig } from '../coordinates/index.js';

/**
 * Get neighboring hexes for a given hex in a flat-topped hex grid.
 * Uses even-q offset with 0-indexed columns (A=0), where columns A, C, E... are shifted down.
 *
 * @param hex - Hex ID (e.g., "F12" for letter-number, "0612" for numeric)
 * @param notation - Coordinate notation to use
 * @param mapConfig - Optional map configuration for filtering by grid bounds and out-of-bounds list
 * @returns Array of valid neighboring hex IDs, sorted
 */
export function getHexNeighbors(
  hex: string,
  notation: CoordinateNotation,
  mapConfig?: MapConfig,
): string[] {
  const coord = parseHexId(hex, notation);
  const neighbors = getNeighborCoords(coord);

  // Filter out neighbors with negative coordinates (invalid hex IDs)
  // and format back to strings
  let validNeighbors = neighbors
    .filter((n) => n.col >= 0 && n.row >= 0)
    .map((n) => formatHexId(n, notation));

  // If map config provided, filter by grid bounds and out-of-bounds list
  if (mapConfig) {
    validNeighbors = validNeighbors.filter((id) => isValidHex(id, mapConfig));
  }

  return sortHexIds(validNeighbors, notation);
}

import {
  formatHexId,
  getNeighborCoords,
  parseHexId,
  sortHexIds,
} from '../coordinates/index.js';

/**
 * Get neighboring hexes for a given hex in a flat-topped hex grid.
 * Uses even-q offset with 0-indexed columns (A=0), where columns A, C, E... are shifted down.
 *
 * Note: This function filters out neighbors with negative coordinates (invalid hex IDs)
 * but does NOT enforce map boundaries. Callers should filter results against their
 * map configuration if needed.
 *
 * @param hex - Hex ID in letter-number format (e.g., "F12")
 * @returns Array of valid neighboring hex IDs, sorted
 */
export function getHexNeighbors(hex: string): string[] {
  const coord = parseHexId(hex, 'letter-number');
  const neighbors = getNeighborCoords(coord);

  // Filter out neighbors with negative coordinates (invalid hex IDs)
  // and format back to strings
  const validNeighbors = neighbors
    .filter((n) => n.col >= 0 && n.row >= 0)
    .map((n) => formatHexId(n, 'letter-number'));

  return sortHexIds(validNeighbors, 'letter-number');
}

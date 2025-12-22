import { parseHexId } from './parse.js';
import type { CoordinateNotation, HexCoord } from './types.js';

/**
 * Compare two hex coordinates for sorting.
 * Sorts by column first (west to east), then by row (north to south).
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
export function compareHexCoords(a: HexCoord, b: HexCoord): number {
  if (a.col !== b.col) {
    return a.col - b.col;
  }
  return a.row - b.row;
}

/**
 * Compare two hex ID strings for sorting.
 * Parses to coordinates and compares column-first, then row.
 */
export function compareHexIds(
  a: string,
  b: string,
  notation: CoordinateNotation,
): number {
  const coordA = parseHexId(a, notation);
  const coordB = parseHexId(b, notation);
  return compareHexCoords(coordA, coordB);
}

/**
 * Sort an array of hex ID strings in place.
 * Sorts by column (west to east), then by row (north to south).
 * Returns the same array for chaining.
 */
export function sortHexIds(
  hexIds: string[],
  notation: CoordinateNotation,
): string[] {
  return hexIds.sort((a, b) => compareHexIds(a, b, notation));
}

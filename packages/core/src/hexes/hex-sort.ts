import { compareHexIds } from '../coordinates/index.js';

import type { CoordinateNotation } from '../coordinates/index.js';

/**
 * Get the column letter from a hex ID.
 * @deprecated Use parseHexId from coordinates module instead
 */
export function getHexColumn(hexId: string): string {
  return hexId.substring(0, 1);
}

/**
 * Get the row number from a hex ID (1-indexed as displayed).
 * @deprecated Use parseHexId from coordinates module instead
 */
export function getHexRow(hexId: string): number {
  return parseInt(hexId.substring(1), 10);
}

/**
 * Sorts two hex IDs first by column (west to east) and then by row (north to south).
 * @param hexIdA - First hex ID
 * @param hexIdB - Second hex ID
 * @param notation - Coordinate notation to use
 */
export function hexSort(
  hexIdA: string,
  hexIdB: string,
  notation: CoordinateNotation,
): number {
  return compareHexIds(hexIdA, hexIdB, notation);
}

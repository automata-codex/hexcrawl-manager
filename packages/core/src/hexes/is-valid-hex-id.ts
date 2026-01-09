import { isValidHexFormat } from '../coordinates/index.js';

import type { CoordinateNotation } from '../coordinates/index.js';

/**
 * Checks if a given string is a valid hex ID.
 * @param hexId - The hex ID to validate
 * @param notation - Coordinate notation to use
 */
export function isValidHexId(
  hexId: string,
  notation: CoordinateNotation,
): boolean {
  return isValidHexFormat(hexId, notation);
}

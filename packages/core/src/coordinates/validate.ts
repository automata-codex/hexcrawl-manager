import {
  LETTER_NUMBER_RE,
  normalizeHexId,
  NUMERIC_RE,
  parseHexId,
} from './parse.js';
import type { CoordinateNotation, GridConfig, HexCoord, MapConfig } from './types.js';

/**
 * Check if a string is a valid hex ID for the given notation.
 * Does not check grid bounds, only format.
 */
export function isValidHexFormat(id: string, notation: CoordinateNotation): boolean {
  if (notation === 'letter-number') {
    const match = id.match(LETTER_NUMBER_RE);
    if (!match) return false;

    // Row must be at least 1
    const row = parseInt(match[2], 10);
    return row >= 1;
  }

  // numeric notation
  const match = id.match(NUMERIC_RE);
  if (!match) return false;

  // Both column and row must be at least 01
  const col = parseInt(match[1], 10);
  const row = parseInt(match[2], 10);
  return col >= 1 && row >= 1;
}

/**
 * Check if a coordinate is within the grid bounds.
 */
export function isWithinGrid(coord: HexCoord, grid: GridConfig): boolean {
  return (
    coord.col >= 0 &&
    coord.col < grid.columns &&
    coord.row >= 0 &&
    coord.row < grid.rows
  );
}

/**
 * Check if a hex ID is in the out-of-bounds list.
 * Normalizes before comparison.
 */
export function isOutOfBounds(
  id: string,
  outOfBounds: string[],
  notation: CoordinateNotation,
): boolean {
  const normalized = normalizeHexId(id, notation);
  const normalizedOutOfBounds = outOfBounds.map((oob) =>
    normalizeHexId(oob, notation),
  );
  return normalizedOutOfBounds.includes(normalized);
}

/**
 * Comprehensive validation: valid format, within grid, not out-of-bounds.
 */
export function isValidHex(id: string, config: MapConfig): boolean {
  const { grid, outOfBounds } = config;

  // Check format first
  if (!isValidHexFormat(id, grid.notation)) {
    return false;
  }

  // Parse to get coordinates
  const coord = parseHexId(id, grid.notation);

  // Check grid bounds
  if (!isWithinGrid(coord, grid)) {
    return false;
  }

  // Check not out-of-bounds
  if (isOutOfBounds(id, outOfBounds, grid.notation)) {
    return false;
  }

  return true;
}

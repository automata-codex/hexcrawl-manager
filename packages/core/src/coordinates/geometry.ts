import type { HexCoord } from './types.js';

/**
 * Cube coordinates for hex distance calculations.
 * In cube coordinates, x + y + z = 0 always holds.
 */
export interface CubeCoord {
  x: number;
  y: number;
  z: number;
}

/**
 * Neighbor offsets for flat-topped hex grid with columns A, C, E... shifted down.
 * Indexed by column parity: [0] = even column indices, [1] = odd column indices.
 * Reference: https://www.redblobgames.com/grids/hexagons/#neighbors-offset
 *
 * Note: With 0-indexed columns (A=0, B=1, ...), columns A, C, E have even indices,
 * so this is "even-q" in Red Blob Games terminology. The existing codebase comments
 * say "odd-q" because they think of A as the 1st column, but we use 0-indexed.
 */
const NEIGHBOR_OFFSETS: Array<Array<{ col: number; row: number }>> = [
  // Even columns (0, 2, 4, ...) - shifted down in even-q
  [
    { col: -1, row: 0 },
    { col: 0, row: -1 },
    { col: +1, row: 0 },
    { col: +1, row: +1 },
    { col: 0, row: +1 },
    { col: -1, row: +1 },
  ],
  // Odd columns (1, 3, 5, ...) - not shifted in even-q
  [
    { col: -1, row: -1 },
    { col: 0, row: -1 },
    { col: +1, row: -1 },
    { col: +1, row: 0 },
    { col: 0, row: +1 },
    { col: -1, row: 0 },
  ],
];

/**
 * Convert hex coordinates to cube coordinates for distance calculations.
 * Uses even-q offset (columns A, C, E... shifted down, with 0-indexed column indices).
 */
export function hexToCube(coord: HexCoord): CubeCoord {
  const x = coord.col;
  // For even-q with 0-indexed columns: z = row - (col + (col & 1)) / 2
  const z = coord.row - ((coord.col + (coord.col & 1)) >> 1);
  const y = -x - z;
  return { x, y, z };
}

/**
 * Calculate the distance between two hexes in hex steps.
 * Uses cube coordinate distance formula.
 */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const ac = hexToCube(a);
  const bc = hexToCube(b);
  return Math.max(
    Math.abs(ac.x - bc.x),
    Math.abs(ac.y - bc.y),
    Math.abs(ac.z - bc.z),
  );
}

/**
 * Get all neighboring hex coordinates.
 * Does not filter by grid bounds—caller should filter if needed.
 * Returns exactly 6 neighbors (some may have negative coordinates).
 */
export function getNeighborCoords(coord: HexCoord): HexCoord[] {
  const parity = coord.col & 1; // 0 for even, 1 for odd
  const offsets = NEIGHBOR_OFFSETS[parity];

  return offsets.map((offset) => ({
    col: coord.col + offset.col,
    row: coord.row + offset.row,
  }));
}

/**
 * Get all hex coordinates within a given distance.
 * Does not filter by grid bounds.
 * Includes the center hex when distance >= 0.
 */
export function getHexesWithinDistance(
  center: HexCoord,
  distance: number,
): HexCoord[] {
  if (distance < 0) {
    return [];
  }

  const results: HexCoord[] = [];
  const centerCube = hexToCube(center);

  // Iterate over cube coordinate range
  for (let dx = -distance; dx <= distance; dx++) {
    for (let dy = Math.max(-distance, -dx - distance); dy <= Math.min(distance, -dx + distance); dy++) {
      const dz = -dx - dy;
      const cube: CubeCoord = {
        x: centerCube.x + dx,
        y: centerCube.y + dy,
        z: centerCube.z + dz,
      };
      results.push(cubeToHex(cube));
    }
  }

  return results;
}

/**
 * Convert cube coordinates back to hex coordinates.
 * Inverse of hexToCube for even-q offset (0-indexed columns).
 */
function cubeToHex(cube: CubeCoord): HexCoord {
  const col = cube.x;
  // For even-q with 0-indexed columns: row = z + (col + (col & 1)) / 2
  const row = cube.z + ((col + (col & 1)) >> 1);
  return { col, row };
}

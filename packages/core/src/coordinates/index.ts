// Types
export type {
  CoordinateNotation,
  GridConfig,
  HexCoord,
  MapConfig,
} from './types.js';

export type { CubeCoord } from './geometry.js';

// Constants
export { LETTER_NUMBER_RE, NUMERIC_RE } from './parse.js';

// Parsing
export { displayHexId, formatHexId, parseHexId } from './parse.js';
// Note: normalizeHexId not exported here to avoid conflict with hexes module.
// Import directly from './parse.js' if needed, or wait for Phase 1.8 migration.

// Validation
export {
  isOutOfBounds,
  isValidHex,
  isValidHexFormat,
  isWithinGrid,
} from './validate.js';

// Geometry
export {
  getHexesWithinDistance,
  getNeighborCoords,
  hexDistance,
  hexToCube,
} from './geometry.js';

// Sorting
export { compareHexCoords, compareHexIds, sortHexIds } from './sort.js';

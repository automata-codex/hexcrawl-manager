// Re-export map configuration types from schemas package
export type {
  CoordinateNotation,
  GridConfig,
  MapConfig,
} from '@achm/schemas';

/**
 * Internal representation of a hex coordinate.
 * Both values are zero-indexed.
 */
export interface HexCoord {
  col: number;
  row: number;
}

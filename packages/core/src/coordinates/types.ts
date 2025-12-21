/**
 * Supported coordinate notation styles.
 * - letter-number: e.g., "f12", "A3" (columns A-Z, max 26 columns)
 * - numeric: e.g., "0312", "0103" (4-digit padded, CCRR format)
 */
export type CoordinateNotation = 'letter-number' | 'numeric';

/**
 * Internal representation of a hex coordinate.
 * Both values are zero-indexed.
 */
export interface HexCoord {
  col: number;
  row: number;
}

/**
 * Grid configuration from map.yaml
 */
export interface GridConfig {
  columns: number;
  rows: number;
  notation: CoordinateNotation;
}

/**
 * Full map configuration from map.yaml
 */
export interface MapConfig {
  grid: GridConfig;
  outOfBounds: string[];
}

import type { CoordinateNotation, HexCoord } from './types.js';

/** Regex for letter-number notation: single letter + one or more digits */
const LETTER_NUMBER_RE = /^([a-zA-Z])(\d+)$/;

/** Regex for numeric notation: exactly 4 digits (CCRR format) */
const NUMERIC_RE = /^(\d{2})(\d{2})$/;

/**
 * Parse a hex ID string into internal coordinates.
 * Accepts either case for letter-number notation.
 *
 * @throws Error if format doesn't match expected notation or values are invalid
 *
 * @example
 * parseHexId("f12", "letter-number") // => { col: 5, row: 11 }
 * parseHexId("F12", "letter-number") // => { col: 5, row: 11 }
 * parseHexId("0312", "numeric")      // => { col: 2, row: 11 }
 */
export function parseHexId(id: string, notation: CoordinateNotation): HexCoord {
  if (notation === 'letter-number') {
    const match = id.match(LETTER_NUMBER_RE);
    if (!match) {
      throw new Error(
        `Invalid hex ID "${id}" for letter-number notation. Expected format: letter + number (e.g., "f12")`,
      );
    }

    const [, letter, digits] = match;
    const col = letter.toLowerCase().charCodeAt(0) - 97; // 'a' = 0
    const row = parseInt(digits, 10) - 1; // 1-indexed to 0-indexed

    if (row < 0) {
      throw new Error(
        `Invalid hex ID "${id}": row must be at least 1 in letter-number notation`,
      );
    }

    return { col, row };
  }

  // numeric notation
  const match = id.match(NUMERIC_RE);
  if (!match) {
    throw new Error(
      `Invalid hex ID "${id}" for numeric notation. Expected format: 4 digits CCRR (e.g., "0312")`,
    );
  }

  const [, colStr, rowStr] = match;
  const col = parseInt(colStr, 10) - 1; // 1-indexed to 0-indexed
  const row = parseInt(rowStr, 10) - 1; // 1-indexed to 0-indexed

  if (col < 0) {
    throw new Error(
      `Invalid hex ID "${id}": column must be at least 01 in numeric notation`,
    );
  }

  if (row < 0) {
    throw new Error(
      `Invalid hex ID "${id}": row must be at least 01 in numeric notation`,
    );
  }

  return { col, row };
}

/**
 * Format internal coordinates as a hex ID string.
 * Always outputs lowercase for letter-number notation.
 *
 * @example
 * formatHexId({ col: 5, row: 11 }, "letter-number") // => "f12"
 * formatHexId({ col: 2, row: 11 }, "numeric")       // => "0312"
 */
export function formatHexId(
  coord: HexCoord,
  notation: CoordinateNotation,
): string {
  if (notation === 'letter-number') {
    const letter = String.fromCharCode(97 + coord.col); // 0 = 'a'
    const row = coord.row + 1; // 0-indexed to 1-indexed
    return `${letter}${row}`;
  }

  // numeric notation
  const col = (coord.col + 1).toString().padStart(2, '0');
  const row = (coord.row + 1).toString().padStart(2, '0');
  return `${col}${row}`;
}

/**
 * Normalize a hex ID to canonical lowercase form.
 * Used for internal storage and comparison.
 *
 * @example
 * normalizeHexId("F12", "letter-number") // => "f12"
 * normalizeHexId("f12", "letter-number") // => "f12"
 * normalizeHexId("0312", "numeric")      // => "0312"
 */
export function normalizeHexId(id: string, notation: CoordinateNotation): string {
  // Parse and re-format to ensure canonical form
  const coord = parseHexId(id, notation);
  return formatHexId(coord, notation);
}

/**
 * Format a hex ID for display (uppercase for letter-number).
 * Used in CLI output and user-facing displays.
 *
 * @example
 * displayHexId("f12", "letter-number") // => "F12"
 * displayHexId("0312", "numeric")      // => "0312"
 */
export function displayHexId(id: string, notation: CoordinateNotation): string {
  if (notation === 'letter-number') {
    return id.toUpperCase();
  }
  return id;
}

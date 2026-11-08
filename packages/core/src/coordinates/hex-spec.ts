import { getHexesWithinDistance } from './geometry.js';
import { formatHexId, normalizeHexId, parseHexId } from './parse.js';
import { sortHexIds } from './sort.js';
import { isValidHexFormat, isWithinGrid } from './validate.js';

import type { HexCoord, MapConfig } from './types.js';

export interface HexSpecResult {
  /** Expanded hex IDs: normalized, deduplicated, sorted west→east, north→south. */
  hexes: string[];
  /** One message per spec that could not be expanded. Valid specs still expand. */
  errors: string[];
}

const RADIUS_RE = /^([^:+]+)\+(\d+)$/;
const RECT_RE = /^([^:+]+):([^:+]+)$/;

/**
 * Expand hex specs into individual hex IDs, using the map config for notation,
 * grid bounds and out-of-bounds hexes.
 *
 * Spec forms (letter-number / numeric notation):
 *   - single hex:  `K7`      / `1107`
 *   - rectangle:   `F10:J14` / `0610:1014`  every column × every row between the corners
 *   - radius:      `M25+2`   / `1325+2`     every hex within N steps of the center
 *   - exclusion:   any form prefixed with `-`
 *
 * The result is (union of included specs) minus (union of excluded specs), so
 * the order of specs never matters.
 *
 * Hexes you type (single IDs, rectangle corners, radius centers) must be
 * within the grid; ranges are then clipped to the grid and skip out-of-bounds
 * hexes. A single hex that is marked out-of-bounds is an error.
 *
 * Errors are collected instead of thrown so a validator can report every bad
 * spec and a renderer can still use the good ones.
 */
export function expandHexSpecs(
  specs: readonly string[],
  config: MapConfig,
): HexSpecResult {
  const notation = config.grid.notation;
  const outOfBounds = new Set(
    config.outOfBounds.map((id) => normalizeHexId(id, notation)),
  );

  const include = new Set<string>();
  const exclude = new Set<string>();
  const errors: string[] = [];

  for (const raw of specs) {
    const spec = raw.trim();
    const negate = spec.startsWith('-');
    const target = negate ? exclude : include;
    try {
      for (const id of expandOne(negate ? spec.slice(1) : spec, config, outOfBounds)) {
        target.add(id);
      }
    } catch (error) {
      errors.push(`"${raw}": ${(error as Error).message}`);
    }
  }

  const hexes = [...include].filter((id) => !exclude.has(id));
  return { hexes: sortHexIds(hexes, notation), errors };
}

function expandOne(
  body: string,
  { grid }: MapConfig,
  outOfBounds: ReadonlySet<string>,
): string[] {
  const notation = grid.notation;

  const anchor = (id: string): HexCoord => {
    if (!isValidHexFormat(id, notation)) {
      throw new Error(`invalid hex ID "${id}" for ${notation} notation`);
    }
    const coord = parseHexId(id, notation);
    if (!isWithinGrid(coord, grid)) {
      throw new Error(`"${id}" is outside the grid`);
    }
    return coord;
  };

  const toIds = (coords: HexCoord[]): string[] =>
    coords
      .filter((coord) => isWithinGrid(coord, grid))
      .map((coord) => formatHexId(coord, notation))
      .filter((id) => !outOfBounds.has(id));

  let match: RegExpMatchArray | null;

  if ((match = body.match(RADIUS_RE))) {
    const center = anchor(match[1]);
    const radius = Number(match[2]);
    // Any radius this large already covers the whole grid; the cap keeps a
    // typo like `M25+999` from generating millions of coordinates.
    const maxRadius = Math.max(grid.columns, grid.rows);
    if (radius > maxRadius) {
      throw new Error(`radius ${radius} exceeds the grid's largest dimension (${maxRadius})`);
    }
    return toIds(getHexesWithinDistance(center, radius));
  }

  if ((match = body.match(RECT_RE))) {
    const a = anchor(match[1]);
    const b = anchor(match[2]);
    const coords: HexCoord[] = [];
    for (let col = Math.min(a.col, b.col); col <= Math.max(a.col, b.col); col++) {
      for (let row = Math.min(a.row, b.row); row <= Math.max(a.row, b.row); row++) {
        coords.push({ col, row });
      }
    }
    return toIds(coords);
  }

  const id = formatHexId(anchor(body), notation);
  if (outOfBounds.has(id)) {
    throw new Error(`"${body}" is marked out-of-bounds`);
  }
  return [id];
}

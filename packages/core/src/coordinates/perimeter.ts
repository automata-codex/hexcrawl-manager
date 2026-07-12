import { getNeighborCoords } from './geometry.js';
import { parseHexId } from './parse.js';

import type { CoordinateNotation, HexCoord } from './types.js';

/**
 * A single edge on the boundary of a group of hexes.
 *
 * `edge` is an index 0–5 into the direction order returned by
 * {@link getNeighborCoords}: edge `i` faces the same direction as that
 * function's `i`-th neighbor (NW, N, NE, SE, S, SW on this even-q flat-topped
 * grid). The web layer projects each `(hexId, edge)` to a pixel line segment
 * using a hex-vertex table aligned to this same order, so this ordering is the
 * single source of truth shared by the topology here and the pixel geometry there.
 */
export interface PerimeterEdge {
  hexId: string;
  edge: number;
}

/**
 * Return the edges that lie on the boundary of a group of hexes.
 *
 * An edge is a boundary edge iff the neighbor across it is NOT in the group;
 * out-of-bounds / off-grid neighbors count as "not in the group". This naturally
 * handles disjoint blobs (each contributes its own ring) and interior holes (the
 * ring around a hole is emitted, facing inward). The result is a set: which edges
 * it contains does not depend on the order of `hexIds`.
 *
 * Membership is tested in coordinate space rather than on formatted hex IDs, so
 * neighbor coordinates that fall off the grid — including negative ones — are
 * handled without round-tripping through `formatHexId` (which rejects negatives).
 *
 * @param hexIds   Hex IDs in the group. Duplicate or case-variant IDs that map to
 *                 the same coordinate collapse to one hex; the first occurrence
 *                 supplies the `hexId` returned for that hex's edges.
 * @param notation Coordinate notation the IDs are written in.
 */
export function getPerimeterEdges(
  hexIds: string[],
  notation: CoordinateNotation,
): PerimeterEdge[] {
  const coordKey = (coord: HexCoord): string => `${coord.col},${coord.row}`;

  // Collapse to unique coordinates, keeping a representative input ID per hex.
  const coordByKey = new Map<string, HexCoord>();
  const idByKey = new Map<string, string>();
  for (const hexId of hexIds) {
    const coord = parseHexId(hexId, notation);
    const key = coordKey(coord);
    if (!idByKey.has(key)) {
      idByKey.set(key, hexId);
      coordByKey.set(key, coord);
    }
  }

  const members = new Set(coordByKey.keys());
  const edges: PerimeterEdge[] = [];
  for (const [key, coord] of coordByKey) {
    const hexId = idByKey.get(key) as string;
    const neighbors = getNeighborCoords(coord);
    for (let edge = 0; edge < neighbors.length; edge += 1) {
      if (!members.has(coordKey(neighbors[edge]))) {
        edges.push({ hexId, edge });
      }
    }
  }

  return edges;
}

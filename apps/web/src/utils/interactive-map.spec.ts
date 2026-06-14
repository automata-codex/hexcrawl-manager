import { getPerimeterEdges, type PerimeterEdge } from '@achm/core';
import { describe, expect, it } from 'vitest';

import { getHexSvgPath } from './hexes.ts';
import {
  centroidOf,
  HEX_VERTICES,
  HEX_WIDTH,
  perimeterEdgesToSegments,
} from './interactive-map.ts';

import type { CoordinateNotation } from '@achm/core';

/** Stable string key for a point, tolerant of float noise. */
const pointKey = (x: number, y: number): string =>
  `${x.toFixed(3)},${y.toFixed(3)}`;

/** Re-key a "x,y" pair string from getHexSvgPath the same way. */
const polygonKey = (pair: string): string => {
  const [x, y] = pair.split(',').map(Number);
  return pointKey(x, y);
};

/**
 * A single hex's outline segments must reconstruct exactly the polygon that
 * getHexSvgPath draws for that hex, and must form a closed loop — that is what
 * confirms HEX_VERTICES is ordered so edge i shares a corner with edge i+1.
 */
function expectSingleHexOutlineMatchesPolygon(
  hexId: string,
  notation: CoordinateNotation,
): void {
  // Build segments edge-by-edge in index order so the closure check is unambiguous.
  const orderedEdges: PerimeterEdge[] = [0, 1, 2, 3, 4, 5].map((edge) => ({
    hexId,
    edge,
  }));
  const segments = perimeterEdgesToSegments(orderedEdges, notation);

  const center = centroidOf([hexId], notation);
  const polygonVertices = new Set(
    getHexSvgPath(center.x, center.y, HEX_WIDTH).split(' ').map(polygonKey),
  );

  // Every segment endpoint is one of the hex's corners (and they cover all six).
  const segmentVertices = new Set<string>();
  for (const s of segments) {
    segmentVertices.add(pointKey(s.x1, s.y1));
    segmentVertices.add(pointKey(s.x2, s.y2));
  }
  expect(segmentVertices).toEqual(polygonVertices);

  // Closed loop: each segment ends where the next begins.
  for (let i = 0; i < segments.length; i += 1) {
    const cur = segments[i];
    const next = segments[(i + 1) % segments.length];
    expect(pointKey(cur.x2, cur.y2)).toBe(pointKey(next.x1, next.y1));
  }
}

describe('HEX_VERTICES', () => {
  it('has six corners', () => {
    expect(HEX_VERTICES).toHaveLength(6);
  });
});

describe('perimeterEdgesToSegments', () => {
  it('reconstructs the hex polygon and closes the loop (numeric)', () => {
    expectSingleHexOutlineMatchesPolygon('0303', 'numeric');
  });

  it('reconstructs the hex polygon and closes the loop (letter-number)', () => {
    expectSingleHexOutlineMatchesPolygon('c3', 'letter-number');
  });

  it('emits one segment per edge for a multi-hex group', () => {
    const edges = getPerimeterEdges(['0303', '0403'], 'numeric');
    const segments = perimeterEdgesToSegments(edges, 'numeric');
    expect(segments).toHaveLength(edges.length);
  });
});

describe('centroidOf', () => {
  it('returns the origin for an empty group', () => {
    expect(centroidOf([], 'numeric')).toEqual({ x: 0, y: 0 });
  });

  it('averages member-hex centers', () => {
    const a = centroidOf(['0303'], 'numeric');
    const b = centroidOf(['0505'], 'numeric');
    const both = centroidOf(['0303', '0505'], 'numeric');
    expect(both.x).toBeCloseTo((a.x + b.x) / 2, 6);
    expect(both.y).toBeCloseTo((a.y + b.y) / 2, 6);
  });
});

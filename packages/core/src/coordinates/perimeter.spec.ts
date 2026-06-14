import { describe, expect, it } from 'vitest';

import { getPerimeterEdges, type PerimeterEdge } from './perimeter.js';

/** Serialize edges into a sortable set form, for order-independent comparison. */
function edgeKeys(edges: PerimeterEdge[]): string[] {
  return edges.map((e) => `${e.hexId}#${e.edge}`).sort();
}

/** Edge indices emitted for a given hex ID, sorted ascending. */
function edgesFor(edges: PerimeterEdge[], hexId: string): number[] {
  return edges
    .filter((e) => e.hexId === hexId)
    .map((e) => e.edge)
    .sort((a, b) => a - b);
}

describe('getPerimeterEdges', () => {
  it('returns all 6 edges for a single hex', () => {
    const edges = getPerimeterEdges(['0303'], 'numeric');
    expect(edges).toHaveLength(6);
    expect(edgesFor(edges, '0303')).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('excludes interior shared edges of a contiguous block', () => {
    // (2,2) (3,2) (2,3) (3,3): a 4-hex blob with 5 shared interior edges,
    // so 24 raw edges minus 2*5 = 14 boundary edges.
    const block = ['0303', '0403', '0304', '0404'];
    const edges = getPerimeterEdges(block, 'numeric');
    expect(edges.length).toBeLessThan(24);
    expect(edges).toHaveLength(14);
  });

  it('is order-independent', () => {
    const block = ['0303', '0403', '0304', '0404'];
    const forward = getPerimeterEdges(block, 'numeric');
    const reversed = getPerimeterEdges([...block].reverse(), 'numeric');
    expect(edgeKeys(reversed)).toEqual(edgeKeys(forward));
  });

  it('emits the inner ring around a one-hex hole', () => {
    // The 6 neighbors of (2,2) form a ring; (2,2) itself is the hole.
    const ring = ['0203', '0302', '0403', '0404', '0304', '0204'];
    const edges = getPerimeterEdges(ring, 'numeric');

    // Ring of 6, each hex adjacent to its 2 ring siblings: 36 - 2*6 = 24 edges
    // (18 facing outward, 6 facing the hole).
    expect(edges).toHaveLength(24);

    // Each ring hex contributes exactly one edge facing the hole at (2,2).
    const innerEdges: Array<[string, number]> = [
      ['0203', 3],
      ['0302', 4],
      ['0403', 5],
      ['0404', 0],
      ['0304', 1],
      ['0204', 2],
    ];
    for (const [hexId, edge] of innerEdges) {
      expect(edges).toContainEqual({ hexId, edge });
    }
  });

  it('treats disjoint blobs independently', () => {
    const block = ['0303', '0403', '0304', '0404']; // 14 boundary edges
    const far = '1010'; // a lone hex far away: 6 edges
    const edges = getPerimeterEdges([...block, far], 'numeric');

    expect(edges).toHaveLength(14 + 6);
    expect(edgesFor(edges, far)).toEqual([0, 1, 2, 3, 4, 5]);
    // The far hex's edges are independent of the block's.
    const blockOnly = getPerimeterEdges(block, 'numeric');
    expect(edgesFor(edges, '0303')).toEqual(edgesFor(blockOnly, '0303'));
  });

  it('counts out-of-bounds neighbors as boundary (grid edge)', () => {
    // (0,0) and (0,1) sit in the corner; most neighbors are off-grid (negative
    // coords). This must not throw, and off-grid neighbors must count as boundary.
    const corner = ['0101', '0102'];
    let edges: PerimeterEdge[] = [];
    expect(() => {
      edges = getPerimeterEdges(corner, 'numeric');
    }).not.toThrow();

    expect(edges).toHaveLength(10);
    // (0,0)'s S neighbor (edge 4) is (0,1), in the set; the other 5 are boundary.
    expect(edgesFor(edges, '0101')).toEqual([0, 1, 2, 3, 5]);
    // (0,1)'s N neighbor (edge 1) is (0,0), in the set; the other 5 are boundary.
    expect(edgesFor(edges, '0102')).toEqual([0, 2, 3, 4, 5]);
  });

  describe('letter-number notation', () => {
    it('returns all 6 edges for a single hex', () => {
      const edges = getPerimeterEdges(['c3'], 'letter-number');
      expect(edges).toHaveLength(6);
      expect(edgesFor(edges, 'c3')).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('matches numeric topology for the corner domino', () => {
      // 'a1','a2' == (0,0),(0,1): same shape as the numeric grid-edge case.
      const edges = getPerimeterEdges(['a1', 'a2'], 'letter-number');
      expect(edges).toHaveLength(10);
      expect(edgesFor(edges, 'a1')).toEqual([0, 1, 2, 3, 5]);
      expect(edgesFor(edges, 'a2')).toEqual([0, 2, 3, 4, 5]);
    });
  });
});

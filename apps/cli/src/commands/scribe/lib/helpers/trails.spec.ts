import { describe, expect, it } from 'vitest';

import { bfsTrailPath, buildTrailGraph, TrailMap } from './trails';

describe('buildTrailGraph', () => {
  it('creates bidirectional edges from trail data', () => {
    const trails: TrailMap = {
      'p12-p13': { permanent: false, streak: 0, usedThisSeason: false },
      'p13-q13': { permanent: false, streak: 0, usedThisSeason: false },
    };

    const graph = buildTrailGraph(trails);

    expect(graph.get('P12')).toEqual(['P13']);
    expect(graph.get('P13')).toEqual(['P12', 'Q13']);
    expect(graph.get('Q13')).toEqual(['P13']);
  });

  it('handles mixed-case hex IDs', () => {
    const trails: TrailMap = {
      'p12-P13': { permanent: false, streak: 0, usedThisSeason: false },
    };

    const graph = buildTrailGraph(trails);

    expect(graph.get('P12')).toEqual(['P13']);
    expect(graph.get('P13')).toEqual(['P12']);
  });

  it('ignores invalid edge formats', () => {
    const trails: TrailMap = {
      'p12-p13': { permanent: false, streak: 0, usedThisSeason: false },
      'invalid': { permanent: false, streak: 0, usedThisSeason: false },
      'a-b-c': { permanent: false, streak: 0, usedThisSeason: false },
    };

    const graph = buildTrailGraph(trails);

    expect(graph.size).toBe(2); // Only P12 and P13
  });
});

describe('bfsTrailPath', () => {
  it('returns single-node path when start equals dest', () => {
    const trails: TrailMap = {};
    const graph = buildTrailGraph(trails);

    const path = bfsTrailPath(graph, trails, 'P12', 'P12');
    expect(path).toEqual(['P12']);
  });

  it('returns null when no path exists', () => {
    const trails: TrailMap = {
      'p12-p13': { permanent: false, streak: 0, usedThisSeason: false },
      'q14-q15': { permanent: false, streak: 0, usedThisSeason: false },
    };
    const graph = buildTrailGraph(trails);

    const path = bfsTrailPath(graph, trails, 'P12', 'Q14');
    expect(path).toBeNull();
  });

  it('returns null when start hex not in graph', () => {
    const trails: TrailMap = {
      'p12-p13': { permanent: false, streak: 0, usedThisSeason: false },
    };
    const graph = buildTrailGraph(trails);

    const path = bfsTrailPath(graph, trails, 'Z99', 'P13');
    expect(path).toBeNull();
  });

  it('finds shortest path in simple chain', () => {
    const trails: TrailMap = {
      'p12-p13': { permanent: false, streak: 0, usedThisSeason: false },
      'p13-q13': { permanent: false, streak: 0, usedThisSeason: false },
      'q13-r14': { permanent: false, streak: 0, usedThisSeason: false },
    };
    const graph = buildTrailGraph(trails);

    const path = bfsTrailPath(graph, trails, 'P12', 'R14');
    expect(path).toEqual(['P12', 'P13', 'Q13', 'R14']);
  });

  it('finds shortest path when multiple routes exist', () => {
    const trails: TrailMap = {
      // Direct path: P12 → P13 → Q13 (2 edges)
      'p12-p13': { permanent: false, streak: 0, usedThisSeason: false },
      'p13-q13': { permanent: false, streak: 0, usedThisSeason: false },
      // Longer path: P12 → R12 → R13 → Q13 (3 edges)
      'p12-r12': { permanent: false, streak: 0, usedThisSeason: false },
      'r12-r13': { permanent: false, streak: 0, usedThisSeason: false },
      'r13-q13': { permanent: false, streak: 0, usedThisSeason: false },
    };
    const graph = buildTrailGraph(trails);

    const path = bfsTrailPath(graph, trails, 'P12', 'Q13');
    expect(path).toEqual(['P12', 'P13', 'Q13']);
  });

  it('prefers permanent trails when tie-breaking', () => {
    const trails: TrailMap = {
      // Two equidistant paths from P12 to Q13
      'p12-p13': { permanent: false, streak: 0, usedThisSeason: false },
      'p13-q13': { permanent: true, streak: 0, usedThisSeason: false }, // Permanent
      'p12-r12': { permanent: false, streak: 0, usedThisSeason: false },
      'r12-q13': { permanent: false, streak: 0, usedThisSeason: false },
    };
    const graph = buildTrailGraph(trails);

    const path = bfsTrailPath(graph, trails, 'P12', 'Q13');
    // Should prefer the path with permanent trail
    expect(path).toEqual(['P12', 'P13', 'Q13']);
  });

  it('prefers usedThisSeason trails when tie-breaking (no permanent)', () => {
    const trails: TrailMap = {
      'p12-p13': { permanent: false, streak: 0, usedThisSeason: true }, // Used
      'p13-q13': { permanent: false, streak: 0, usedThisSeason: false },
      'p12-r12': { permanent: false, streak: 0, usedThisSeason: false },
      'r12-q13': { permanent: false, streak: 0, usedThisSeason: false },
    };
    const graph = buildTrailGraph(trails);

    const path = bfsTrailPath(graph, trails, 'P12', 'Q13');
    expect(path).toEqual(['P12', 'P13', 'Q13']);
  });

  it('prefers higher streak when tie-breaking (no permanent or used)', () => {
    const trails: TrailMap = {
      'p12-p13': { permanent: false, streak: 5, usedThisSeason: false }, // Higher streak
      'p13-q13': { permanent: false, streak: 0, usedThisSeason: false },
      'p12-r12': { permanent: false, streak: 2, usedThisSeason: false },
      'r12-q13': { permanent: false, streak: 0, usedThisSeason: false },
    };
    const graph = buildTrailGraph(trails);

    const path = bfsTrailPath(graph, trails, 'P12', 'Q13');
    expect(path).toEqual(['P12', 'P13', 'Q13']);
  });

  it('handles complex network with cycles', () => {
    const trails: TrailMap = {
      'p12-p13': { permanent: false, streak: 0, usedThisSeason: false },
      'p13-q13': { permanent: false, streak: 0, usedThisSeason: false },
      'q13-q12': { permanent: false, streak: 0, usedThisSeason: false },
      'q12-p12': { permanent: false, streak: 0, usedThisSeason: false }, // Cycle back
      'q13-r14': { permanent: false, streak: 0, usedThisSeason: false },
    };
    const graph = buildTrailGraph(trails);

    const path = bfsTrailPath(graph, trails, 'P12', 'R14');
    expect(path).toEqual(['P12', 'P13', 'Q13', 'R14']);
  });
});

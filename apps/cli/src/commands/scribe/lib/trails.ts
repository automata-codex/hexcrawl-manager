import { normalizeHexId } from '@achm/core';

import type { TrailMap } from '@achm/schemas';

/**
 * Build an undirected graph from trail data.
 * Each edge A-B creates two directed edges: A→B and B→A.
 */
export function buildTrailGraph(trails: TrailMap): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  for (const [edge] of Object.entries(trails)) {
    const parts = edge.split('-');
    if (parts.length !== 2) continue;

    const [a, b] = parts.map(normalizeHexId);
    if (!a || !b) continue;

    // Add bidirectional edges
    if (!graph.has(a)) graph.set(a, []);
    if (!graph.has(b)) graph.set(b, []);

    graph.get(a)!.push(b);
    graph.get(b)!.push(a);
  }

  return graph;
}

/**
 * Calculate a score for neighbor selection during BFS.
 * Higher scores are preferred when breaking ties.
 * Priority: permanent > usedThisSeason > higher streak
 */
function neighborScore(u: string, v: string, trails: TrailMap): number {
  // Try both edge directions
  const edges = [
    `${u}-${v}`,
    `${v}-${u}`,
    `${u.toLowerCase()}-${v.toLowerCase()}`,
    `${v.toLowerCase()}-${u.toLowerCase()}`,
  ];

  for (const edge of edges) {
    const trail = trails[edge];
    if (trail) {
      let score = 0;
      if (trail.permanent) score += 1000;
      if (trail.usedThisSeason) score += 100;
      score += trail.streak ?? 0;
      return score;
    }
  }

  return 0;
}

/**
 * Find the shortest path from start to dest using BFS.
 * When multiple neighbors are equidistant, prefer trails that are:
 * 1. permanent, then 2. usedThisSeason, then 3. higher streak
 *
 * @returns Path as array of hex IDs, or null if no path exists
 */
export function bfsTrailPath(
  graph: Map<string, string[]>,
  trails: TrailMap,
  start: string,
  dest: string,
): string[] | null {
  const startNorm = normalizeHexId(start);
  const destNorm = normalizeHexId(dest);

  if (startNorm === destNorm) return []; // Already at destination, no moves needed
  if (!graph.has(startNorm) || !graph.has(destNorm)) return null;

  const queue: string[] = [startNorm];
  const visited = new Set<string>([startNorm]);
  const parent = new Map<string, string>();

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === destNorm) {
      // Reconstruct path (excluding start hex)
      const path: string[] = [];
      let node: string | undefined = destNorm;
      while (node !== undefined) {
        path.unshift(node);
        node = parent.get(node);
      }
      // Remove the starting hex - route represents "where to go", not "where we are"
      return path.slice(1);
    }

    const neighbors = graph.get(current) || [];

    // Sort neighbors by score (descending) for tie-breaking
    const sortedNeighbors = neighbors
      .filter((n) => !visited.has(n))
      .map((n) => ({
        hex: n,
        score: neighborScore(current, n, trails),
      }))
      .sort((a, b) => b.score - a.score);

    for (const { hex } of sortedNeighbors) {
      if (!visited.has(hex)) {
        visited.add(hex);
        parent.set(hex, current);
        queue.push(hex);
      }
    }
  }

  return null; // No path found
}

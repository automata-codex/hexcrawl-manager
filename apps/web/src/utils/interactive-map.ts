import { parseHexId } from './hexes.ts';

import type { CoordinateNotation, PerimeterEdge } from '@achm/core';

export const DEG_TO_RAD = Math.PI / 180;
export const HEX_WIDTH = 100;
export const HEX_HEIGHT = (Math.sqrt(3) / 2) * HEX_WIDTH;
export const HEX_RADIUS = HEX_WIDTH / 2;
export const EDGE_OFFSET = HEX_HEIGHT / 2;

export const TERRAIN_ICON_SIZE = 90;

/** Outline color/width for region borders (the reference design's orange). */
export const REGION_BORDER_COLOR = '#e8852a';
export const REGION_BORDER_WIDTH = 5;

export function axialToPixel(q: number, r: number) {
  const x = q * (0.75 * HEX_WIDTH);
  const y = HEX_HEIGHT * (r + 0.5 * ((q + 1) % 2));
  return { x, y };
}

/**
 * Pixel offsets from a hex center for named anchor points: the center, the six
 * corners (compass-named), and the six edge midpoints (`side1`–`side6`). Used to
 * anchor path endpoints (rivers/trails/conduits) and, via HEX_VERTICES, region
 * and faction outlines.
 */
export const ANCHOR_OFFSETS = {
  center: { dx: 0, dy: 0 },
  northeast: {
    dx: HEX_RADIUS * Math.sin(30 * DEG_TO_RAD),
    dy: -HEX_RADIUS * Math.cos(30 * DEG_TO_RAD),
  },
  east: {
    dx: HEX_RADIUS * Math.sin(90 * DEG_TO_RAD),
    dy: -HEX_RADIUS * Math.cos(90 * DEG_TO_RAD),
  },
  southeast: {
    dx: HEX_RADIUS * Math.sin(150 * DEG_TO_RAD),
    dy: -HEX_RADIUS * Math.cos(150 * DEG_TO_RAD),
  },
  southwest: {
    dx: HEX_RADIUS * Math.sin(210 * DEG_TO_RAD),
    dy: -HEX_RADIUS * Math.cos(210 * DEG_TO_RAD),
  },
  west: {
    dx: HEX_RADIUS * Math.sin(270 * DEG_TO_RAD),
    dy: -HEX_RADIUS * Math.cos(270 * DEG_TO_RAD),
  },
  northwest: {
    dx: HEX_RADIUS * Math.sin(330 * DEG_TO_RAD),
    dy: -HEX_RADIUS * Math.cos(330 * DEG_TO_RAD),
  },
  side1: { dx: 0, dy: -EDGE_OFFSET },
  side2: {
    dx: EDGE_OFFSET * Math.sin(60 * DEG_TO_RAD),
    dy: -EDGE_OFFSET * Math.cos(60 * DEG_TO_RAD),
  },
  side3: {
    dx: EDGE_OFFSET * Math.sin(120 * DEG_TO_RAD),
    dy: -EDGE_OFFSET * Math.cos(120 * DEG_TO_RAD),
  },
  side4: { dx: 0, dy: EDGE_OFFSET },
  side5: {
    dx: EDGE_OFFSET * Math.sin(240 * DEG_TO_RAD),
    dy: -EDGE_OFFSET * Math.cos(240 * DEG_TO_RAD),
  },
  side6: {
    dx: EDGE_OFFSET * Math.sin(300 * DEG_TO_RAD),
    dy: -EDGE_OFFSET * Math.cos(300 * DEG_TO_RAD),
  },
};

/**
 * The six hex corners as offsets from the hex center, ordered so that boundary
 * edge `i` (see {@link PerimeterEdge}) spans HEX_VERTICES[i] -> HEX_VERTICES[(i +
 * 1) % 6]. This is the corner subset of ANCHOR_OFFSETS, reordered to match
 * @achm/core's getNeighborCoords direction order (0:NW 1:N 2:NE 3:SE 4:S 5:SW).
 */
export const HEX_VERTICES: ReadonlyArray<{ dx: number; dy: number }> = [
  ANCHOR_OFFSETS.west, //      0: edge NW begins at the left corner (180°)
  ANCHOR_OFFSETS.northwest, // 1: upper-left  (240°)
  ANCHOR_OFFSETS.northeast, // 2: upper-right (300°)
  ANCHOR_OFFSETS.east, //      3: right       (0°)
  ANCHOR_OFFSETS.southeast, // 4: lower-right (60°)
  ANCHOR_OFFSETS.southwest, // 5: lower-left  (120°)
];

/**
 * Project boundary edges to pixel line segments. Each `(hexId, edge)` becomes the
 * segment spanning that edge's two hex corners, via axialToPixel + HEX_VERTICES.
 */
export function perimeterEdgesToSegments(
  edges: PerimeterEdge[],
  notation: CoordinateNotation,
): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  return edges.map(({ hexId, edge }) => {
    const { q, r } = parseHexId(hexId, notation);
    const { x, y } = axialToPixel(q, r);
    const start = HEX_VERTICES[edge];
    const end = HEX_VERTICES[(edge + 1) % HEX_VERTICES.length];
    return {
      x1: x + start.dx,
      y1: y + start.dy,
      x2: x + end.dx,
      y2: y + end.dy,
    };
  });
}

/**
 * Average of the member hexes' pixel centers, for label placement. Returns the
 * origin for an empty group.
 */
export function centroidOf(
  hexIds: string[],
  notation: CoordinateNotation,
): { x: number; y: number } {
  if (hexIds.length === 0) {
    return { x: 0, y: 0 };
  }
  let sumX = 0;
  let sumY = 0;
  for (const hexId of hexIds) {
    const { q, r } = parseHexId(hexId, notation);
    const { x, y } = axialToPixel(q, r);
    sumX += x;
    sumY += y;
  }
  return { x: sumX / hexIds.length, y: sumY / hexIds.length };
}

export function getTravelDifficulty(
  biomeTag?: string,
  terrainType?: string,
): string {
  const baseDifficultyMap: Record<string, string> = {
    'alpine-tundra': 'Difficult',
    'boreal-forest': 'Normal',
    'coastal-ocean': 'Difficult (water travel)',
    'coastal-prairie': 'Normal',
    'coastal-swamp': 'Difficult',
    'freshwater-lake': 'Difficult (water travel)',
    glacier: 'Difficult',
    'highland-bog': 'Difficult',
    marsh: 'Difficult',
    'mixed-woodland': 'Normal',
    'montane-forest': 'Difficult',
    'montane-grassland': 'Normal',
    moors: 'Difficult',
    prairie: 'Normal',
    'rocky-highland': 'Difficult',
    'subalpine-woodland': 'Normal',
    swamp: 'Difficult',
    'temperate-forest': 'Normal',
    'temperate-rainforest': 'Difficult',
    'temperate-woodland': 'Normal',
  };

  if (terrainType === 'mountains' || terrainType === 'peak') {
    return 'Difficult';
  }

  return baseDifficultyMap[biomeTag ?? ''] ?? 'Unknown';
}

export function getFavoredTerrain(
  biomeTag?: string,
  terrainType?: string,
): string {
  const baseTerrainMap: Record<string, string> = {
    'alpine-tundra': 'Mountain',
    'boreal-forest': 'Forest',
    'coastal-ocean': 'Coast',
    'coastal-prairie': 'Grassland',
    'coastal-swamp': 'Swamp',
    'freshwater-lake': 'Coast',
    glacier: 'Arctic',
    'highland-bog': 'Swamp',
    marsh: 'Swamp',
    'mixed-woodland': 'Grassland/Forest',
    'montane-forest': 'Forest',
    'montane-grassland': 'Grassland',
    moors: 'Grassland',
    prairie: 'Grassland',
    'rocky-highland': 'Mountain',
    'subalpine-woodland': 'Forest',
    swamp: 'Swamp',
    'temperate-forest': 'Forest',
    'temperate-rainforest': 'Forest',
    'temperate-woodland': 'Forest',
  };

  const base = baseTerrainMap[biomeTag ?? ''];
  if (!base) return 'Unknown';

  // Handle forest+mountain overlaps
  const forestBiomes = new Set([
    'montane-forest',
    'subalpine-woodland',
    'boreal-forest',
    'mixed-woodland',
    'temperate-forest',
    'temperate-woodland',
    'temperate-rainforest',
  ]);

  if (
    forestBiomes.has(biomeTag ?? '') &&
    (terrainType === 'mountains' || terrainType === 'peak')
  ) {
    return `${base}/Mountain`;
  }

  return base;
}

/**
 * Bounds of the map in SVG coordinate space.
 */
export interface MapBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

/**
 * Calculate the pixel bounds of the map from hex data.
 * Returns the bounding box that contains all hexes plus the center point.
 */
export function calculateMapBounds(
  hexIds: string[],
  notation: CoordinateNotation,
): MapBounds {
  if (hexIds.length === 0) {
    // Return default bounds for empty map
    return {
      minX: 0,
      minY: 0,
      maxX: 800,
      maxY: 800,
      centerX: 400,
      centerY: 400,
      width: 800,
      height: 800,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const hexId of hexIds) {
    const { q, r } = parseHexId(hexId, notation);
    const { x, y } = axialToPixel(q, r);

    // Account for hex dimensions
    minX = Math.min(minX, x - HEX_WIDTH / 2);
    maxX = Math.max(maxX, x + HEX_WIDTH / 2);
    minY = Math.min(minY, y - HEX_HEIGHT / 2);
    maxY = Math.max(maxY, y + HEX_HEIGHT / 2);
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  return { minX, minY, maxX, maxY, centerX, centerY, width, height };
}

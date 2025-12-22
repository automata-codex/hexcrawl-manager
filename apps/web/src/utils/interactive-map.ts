import { parseHexId } from './hexes.ts';

export const DEG_TO_RAD = Math.PI / 180;
export const HEX_WIDTH = 100;
export const HEX_HEIGHT = (Math.sqrt(3) / 2) * HEX_WIDTH;
export const HEX_RADIUS = HEX_WIDTH / 2;
export const EDGE_OFFSET = HEX_HEIGHT / 2;

export const DAGARIC_ICON_SIZE = 80;
export const FC_ICON_SIZE = 60;
export const TERRAIN_ICON_SIZE = 90;

export function axialToPixel(q: number, r: number) {
  const x = q * (0.75 * HEX_WIDTH);
  const y = HEX_HEIGHT * (r + 0.5 * ((q + 1) % 2));
  return { x, y };
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
export function calculateMapBounds(hexIds: string[]): MapBounds {
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
    const { q, r } = parseHexId(hexId);
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

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

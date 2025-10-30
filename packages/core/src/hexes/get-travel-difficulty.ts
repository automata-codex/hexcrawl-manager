export type TravelDifficulty =
  | 'Normal'
  | 'Difficult'
  | 'Difficult (water travel)'
  | 'Unknown';

/**
 * Determine the travel difficulty for a hex based on its biome and terrain type.
 * Extracted from apps/web/src/utils/interactive-map.ts for shared usage.
 */
export function getTravelDifficulty(
  biomeTag?: string,
  terrainType?: string,
): TravelDifficulty {
  const baseDifficultyMap: Record<string, TravelDifficulty> = {
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

  // Mountains and peaks are always difficult
  if (terrainType === 'mountains' || terrainType === 'peak') {
    return 'Difficult';
  }

  return baseDifficultyMap[biomeTag ?? ''] ?? 'Unknown';
}

/**
 * Check if a travel difficulty represents difficult terrain.
 */
export function isDifficultTerrain(difficulty: TravelDifficulty): boolean {
  return difficulty.startsWith('Difficult');
}

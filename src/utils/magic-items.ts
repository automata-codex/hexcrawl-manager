export const allRarities = [
  'common',
  'uncommon',
  'rare',
  'very rare',
  'legendary',
  'artifact',
] as const;

export type Rarity = (typeof allRarities)[number];

export type RarityCounts = Record<Rarity, number>;

// Initialize with 0s to ensure all keys are present
export const initialRarityCounts: RarityCounts = Object.fromEntries(
  allRarities.map(r => [r, 0])
) as RarityCounts;

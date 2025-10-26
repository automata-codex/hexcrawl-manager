import { describe, expect, it } from 'vitest';

import {
  getTravelDifficulty,
  isDifficultTerrain,
} from './get-travel-difficulty';

describe('getTravelDifficulty', () => {
  it('returns Difficult for alpine-tundra biome', () => {
    expect(getTravelDifficulty('alpine-tundra')).toBe('Difficult');
  });

  it('returns Normal for boreal-forest biome', () => {
    expect(getTravelDifficulty('boreal-forest')).toBe('Normal');
  });

  it('returns Difficult for mountains terrain regardless of biome', () => {
    expect(getTravelDifficulty('prairie', 'mountains')).toBe('Difficult');
    expect(getTravelDifficulty('temperate-forest', 'mountains')).toBe(
      'Difficult',
    );
  });

  it('returns Difficult for peak terrain regardless of biome', () => {
    expect(getTravelDifficulty('prairie', 'peak')).toBe('Difficult');
  });

  it('returns Difficult (water travel) for water biomes', () => {
    expect(getTravelDifficulty('coastal-ocean')).toBe(
      'Difficult (water travel)',
    );
    expect(getTravelDifficulty('freshwater-lake')).toBe(
      'Difficult (water travel)',
    );
  });

  it('returns Unknown for unrecognized biome', () => {
    expect(getTravelDifficulty('unknown-biome')).toBe('Unknown');
  });

  it('returns Unknown when no biome or terrain provided', () => {
    expect(getTravelDifficulty()).toBe('Unknown');
  });
});

describe('isDifficultTerrain', () => {
  it('returns true for Difficult', () => {
    expect(isDifficultTerrain('Difficult')).toBe(true);
  });

  it('returns true for Difficult (water travel)', () => {
    expect(isDifficultTerrain('Difficult (water travel)')).toBe(true);
  });

  it('returns false for Normal', () => {
    expect(isDifficultTerrain('Normal')).toBe(false);
  });

  it('returns false for Unknown', () => {
    expect(isDifficultTerrain('Unknown')).toBe(false);
  });
});

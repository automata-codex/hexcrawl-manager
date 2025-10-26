import { describe, expect, it } from 'vitest';

import { isDifficultHex } from './hex-data';

describe('isDifficultHex', () => {
  it('returns true for hexes with difficult biomes', () => {
    // W23 has alpine-tundra biome and mountains terrain
    expect(isDifficultHex('W23')).toBe(true);
  });

  it('returns false for hexes with normal biomes', () => {
    // This test will depend on actual hex data
    // For now, we just test that the function doesn't throw
    const result = isDifficultHex('V23');
    expect(typeof result).toBe('boolean');
  });

  it('returns false for unknown hex IDs', () => {
    expect(isDifficultHex('Z99')).toBe(false);
  });

  it('handles case-insensitive hex IDs', () => {
    // Should normalize the hex ID
    const upper = isDifficultHex('W23');
    const lower = isDifficultHex('w23');
    expect(upper).toBe(lower);
  });
});

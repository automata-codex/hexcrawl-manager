import { describe, it, expect } from 'vitest';

import { tierFromLevel } from './tier-from-level.js';

describe('tierFromLevel', () => {
  it('returns 1 for undefined', () => {
    expect(tierFromLevel(undefined)).toBe(1);
  });
  it('returns 1 for levels 1-4', () => {
    for (let lvl = 1; lvl <= 4; lvl++) {
      expect(tierFromLevel(lvl)).toBe(1);
    }
  });
  it('returns 2 for levels 5-10', () => {
    for (let lvl = 5; lvl <= 10; lvl++) {
      expect(tierFromLevel(lvl)).toBe(2);
    }
  });
  it('returns 3 for levels 11-16', () => {
    for (let lvl = 11; lvl <= 16; lvl++) {
      expect(tierFromLevel(lvl)).toBe(3);
    }
  });
  it('returns 4 for levels 17-20', () => {
    for (let lvl = 17; lvl <= 20; lvl++) {
      expect(tierFromLevel(lvl)).toBe(4);
    }
  });
  it('returns 1 for out-of-range', () => {
    expect(tierFromLevel(0)).toBe(1);
    expect(tierFromLevel(21)).toBe(1);
  });
});

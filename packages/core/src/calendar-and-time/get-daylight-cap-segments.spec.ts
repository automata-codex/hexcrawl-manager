import { describe, expect, it } from 'vitest';

import { getDaylightCapSegments } from './get-daylight-cap-segments';

describe('getDaylightCapSegments', () => {
  it('returns 18 segments (9 hours) for winter date', () => {
    const date = { year: 1512, month: 'Gelidus', day: 15 };
    expect(getDaylightCapSegments(date)).toBe(18);
  });

  it('returns 24 segments (12 hours) for spring date', () => {
    const date = { year: 1512, month: 'Pluvoris', day: 15 };
    expect(getDaylightCapSegments(date)).toBe(24);
  });

  it('returns 30 segments (15 hours) for summer date', () => {
    const date = { year: 1512, month: 'Aestara', day: 15 };
    expect(getDaylightCapSegments(date)).toBe(30);
  });

  it('returns 24 segments (12 hours) for autumn date', () => {
    const date = { year: 1512, month: 'Umbraeus', day: 15 };
    expect(getDaylightCapSegments(date)).toBe(24);
  });
});

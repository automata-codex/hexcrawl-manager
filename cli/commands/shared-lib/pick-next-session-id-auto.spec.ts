import { describe, it, expect } from 'vitest';

import { pickNextSessionIdAuto } from './pick-next-session-id-auto.ts';

describe('pickNextSessionIdAuto', () => {
  it('picks the smallest available > max completed', () => {
    expect(pickNextSessionIdAuto([19, 20], [21, 22, 23])).toBe('session-0021');
    expect(pickNextSessionIdAuto([19], [20, 21])).toBe('session-0020');
  });
  it('throws if no available session', () => {
    expect(() => pickNextSessionIdAuto([21], [20, 21])).toThrow();
  });
  it('handles empty completed', () => {
    expect(pickNextSessionIdAuto([], [1, 2, 3])).toBe('session-0001');
  });
});


import { describe, it, expect } from 'vitest';

import { pickNextSessionId } from './pick-next-session-id';

describe('pickNextSessionIdAuto', () => {
  it('picks the smallest available > max completed', () => {
    expect(pickNextSessionId([19, 20], [21, 22, 23])).toBe('session-0021');
    expect(pickNextSessionId([19], [20, 21])).toBe('session-0020');
  });
  it('throws if no available session', () => {
    expect(() => pickNextSessionId([21], [20, 21])).toThrow();
  });
  it('handles empty completed', () => {
    expect(pickNextSessionId([], [1, 2, 3])).toBe('session-0001');
  });
});

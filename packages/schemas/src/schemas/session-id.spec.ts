import { describe, it, expect } from 'vitest';

import { padSessionNum } from './session-id.js';

describe('padSessionNum', () => {
  it('pads numeric inputs to four digits', () => {
    expect(padSessionNum(4)).toBe('0004');
    expect(padSessionNum(21)).toBe('0021');
    expect(padSessionNum(9999)).toBe('9999');
  });

  it('normalizes short numeric strings', () => {
    expect(padSessionNum('4')).toBe('0004');
    expect(padSessionNum('21')).toBe('0021');
  });

  it('returns four-digit strings unchanged', () => {
    expect(padSessionNum('0004')).toBe('0004');
    expect(padSessionNum('1234')).toBe('1234');
  });

  it('truncates over-padded numeric strings to last four digits', () => {
    expect(padSessionNum('000000005')).toBe('0005');
    expect(padSessionNum('00000021')).toBe('0021');
  });

  it('strips leading zeros before re-padding', () => {
    expect(padSessionNum('000000021')).toBe('0021');
  });

  it('throws for non-numeric strings', () => {
    expect(() => padSessionNum('abcd')).toThrow();
    expect(() => padSessionNum('12a4')).toThrow();
    expect(() => padSessionNum('')).toThrow();
  });
});

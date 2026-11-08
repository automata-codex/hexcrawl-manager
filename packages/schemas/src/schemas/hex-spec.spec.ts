import { describe, expect, it } from 'vitest';

import { HexSpecSchema, restoreNumericHexId } from './hex-spec.js';

describe('restoreNumericHexId', () => {
  it('pads YAML-parsed numeric IDs back to four digits', () => {
    expect(restoreNumericHexId(101)).toBe('0101');
    expect(restoreNumericHexId(1012)).toBe('1012');
    expect(restoreNumericHexId(8)).toBe('0008');
  });

  it('restores numeric exclusions', () => {
    expect(restoreNumericHexId(-101)).toBe('-0101');
  });

  it('passes through non-integers', () => {
    expect(restoreNumericHexId('f12')).toBe('f12');
    expect(restoreNumericHexId(1.5)).toBe(1.5);
  });
});

describe('HexSpecSchema', () => {
  it.each([
    'K7',
    'f12',
    '0101',
    'F10:J14',
    '0610:1014',
    'M25+2',
    '1325+2',
    '-G12',
    '-0712',
    '-F10:G11',
    '-M25+1',
  ])('accepts %s', (spec) => {
    expect(HexSpecSchema.parse(spec)).toBe(spec);
  });

  it('accepts unquoted numeric IDs as parsed by YAML', () => {
    expect(HexSpecSchema.parse(101)).toBe('0101');
    expect(HexSpecSchema.parse(-712)).toBe('-0712');
  });

  it.each(['F10-J14', 'F10:J14:K15', 'M25+', 'M25+-2', '', 'f 12', '--G12'])(
    'rejects %s',
    (spec) => {
      expect(HexSpecSchema.safeParse(spec).success).toBe(false);
    },
  );

  it('rejects non-integer numbers', () => {
    expect(HexSpecSchema.safeParse(1.5).success).toBe(false);
  });
});

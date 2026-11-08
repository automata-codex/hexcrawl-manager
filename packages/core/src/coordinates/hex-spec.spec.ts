import { describe, expect, it } from 'vitest';

import { getNeighborCoords } from './geometry.js';
import { expandHexSpecs } from './hex-spec.js';
import { formatHexId, parseHexId } from './parse.js';
import { sortHexIds } from './sort.js';

import type { MapConfig } from './types.js';

function mapConfig(
  notation: MapConfig['grid']['notation'],
  outOfBounds: string[] = [],
  columns = 10,
  rows = 10,
): MapConfig {
  return { grid: { columns, rows, notation }, outOfBounds } as MapConfig;
}

const LN = mapConfig('letter-number');
const NUM = mapConfig('numeric');

describe('expandHexSpecs', () => {
  describe('single hexes', () => {
    it('normalizes case', () => {
      expect(expandHexSpecs(['K7', 'b2'], mapConfig('letter-number', [], 12))).toEqual({
        hexes: ['b2', 'k7'],
        errors: [],
      });
    });

    it('accepts numeric IDs', () => {
      expect(expandHexSpecs(['0101', '0310'], NUM).hexes).toEqual(['0101', '0310']);
    });

    it('deduplicates', () => {
      expect(expandHexSpecs(['c3', 'C3'], LN).hexes).toEqual(['c3']);
    });

    it('rejects an ID in the wrong notation', () => {
      const { hexes, errors } = expandHexSpecs(['c3'], NUM);
      expect(hexes).toEqual([]);
      expect(errors).toEqual(['"c3": invalid hex ID "c3" for numeric notation']);
    });

    it('rejects an ID outside the grid', () => {
      expect(expandHexSpecs(['k1'], LN).errors).toEqual(['"k1": "k1" is outside the grid']);
      expect(expandHexSpecs(['1101'], NUM).errors).toEqual([
        '"1101": "1101" is outside the grid',
      ]);
    });

    it('rejects a single hex marked out-of-bounds', () => {
      const { errors } = expandHexSpecs(['E5'], mapConfig('letter-number', ['e5']));
      expect(errors).toEqual(['"E5": "E5" is marked out-of-bounds']);
    });

    it('rejects a numeric ID with a zero column', () => {
      expect(expandHexSpecs(['0008'], NUM).errors).toHaveLength(1);
    });
  });

  describe('rectangles', () => {
    it('covers every column × row between the corners', () => {
      expect(expandHexSpecs(['b2:c3'], LN).hexes).toEqual(['b2', 'b3', 'c2', 'c3']);
    });

    it('accepts corners in either order', () => {
      expect(expandHexSpecs(['C3:B2'], LN).hexes).toEqual(['b2', 'b3', 'c2', 'c3']);
      expect(expandHexSpecs(['c2:b3'], LN).hexes).toEqual(['b2', 'b3', 'c2', 'c3']);
    });

    it('works in numeric notation', () => {
      expect(expandHexSpecs(['0203:0304'], NUM).hexes).toEqual([
        '0203',
        '0204',
        '0303',
        '0304',
      ]);
    });

    it('skips out-of-bounds hexes inside the range', () => {
      const config = mapConfig('letter-number', ['c3']);
      expect(expandHexSpecs(['b2:c3'], config)).toEqual({
        hexes: ['b2', 'b3', 'c2'],
        errors: [],
      });
    });

    it('rejects a corner outside the grid', () => {
      const { hexes, errors } = expandHexSpecs(['b2:z3'], LN);
      expect(hexes).toEqual([]);
      expect(errors).toEqual(['"b2:z3": "z3" is outside the grid']);
    });
  });

  describe('radii', () => {
    it('radius 0 is just the center', () => {
      expect(expandHexSpecs(['e5+0'], LN).hexes).toEqual(['e5']);
    });

    it('radius 1 is the center plus its six neighbors', () => {
      for (const center of ['c3', 'd3']) {
        const neighbors = getNeighborCoords(parseHexId(center, 'letter-number')).map(
          (coord) => formatHexId(coord, 'letter-number'),
        );
        expect(expandHexSpecs([`${center}+1`], LN).hexes).toEqual(
          sortHexIds([center, ...neighbors], 'letter-number'),
        );
      }
    });

    it('clips to the grid at a corner (numeric)', () => {
      expect(expandHexSpecs(['0101+1'], NUM)).toEqual({
        hexes: ['0101', '0102', '0201', '0202'],
        errors: [],
      });
    });

    it('skips out-of-bounds hexes inside the radius', () => {
      const config = mapConfig('numeric', ['0102']);
      expect(expandHexSpecs(['0101+1'], config).hexes).toEqual(['0101', '0201', '0202']);
    });

    it('rejects a center outside the grid', () => {
      expect(expandHexSpecs(['k5+2'], LN).errors).toEqual(['"k5+2": "k5" is outside the grid']);
    });

    it("caps the radius at the grid's largest dimension", () => {
      const config = mapConfig('letter-number', [], 10, 12);
      expect(expandHexSpecs(['e5+12'], config).errors).toEqual([]);
      expect(expandHexSpecs(['e5+999'], config).errors).toEqual([
        '"e5+999": radius 999 exceeds the grid\'s largest dimension (12)',
      ]);
    });
  });

  describe('exclusions', () => {
    it('removes a hex from a range', () => {
      expect(expandHexSpecs(['b2:c3', '-c3'], LN).hexes).toEqual(['b2', 'b3', 'c2']);
    });

    it('is order-independent', () => {
      expect(expandHexSpecs(['-c3', 'b2:c3'], LN).hexes).toEqual(['b2', 'b3', 'c2']);
    });

    it('accepts range and radius forms', () => {
      expect(expandHexSpecs(['a1:d4', '-b1:d4'], LN).hexes).toEqual([
        'a1',
        'a2',
        'a3',
        'a4',
      ]);
      expect(expandHexSpecs(['0101+1', '-0101+0'], NUM).hexes).toEqual([
        '0102',
        '0201',
        '0202',
      ]);
    });

    it('works with numeric single hexes', () => {
      expect(expandHexSpecs(['0101:0202', '-0202'], NUM).hexes).toEqual([
        '0101',
        '0102',
        '0201',
      ]);
    });

    it('excluding a hex nothing included is a no-op', () => {
      expect(expandHexSpecs(['c3', '-h8'], LN)).toEqual({ hexes: ['c3'], errors: [] });
    });

    it('validates excluded specs too', () => {
      expect(expandHexSpecs(['c3', '-z9'], LN).errors).toEqual([
        '"-z9": "z9" is outside the grid',
      ]);
    });
  });

  it('keeps expanding valid specs past a bad one', () => {
    const { hexes, errors } = expandHexSpecs(['c3', 'nonsense', 'd4'], LN);
    expect(hexes).toEqual(['c3', 'd4']);
    expect(errors).toHaveLength(1);
  });

  it('returns nothing for an empty list', () => {
    expect(expandHexSpecs([], LN)).toEqual({ hexes: [], errors: [] });
  });
});

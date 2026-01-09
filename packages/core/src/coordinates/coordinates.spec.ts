import { describe, expect, it } from 'vitest';

import {
  getHexesWithinDistance,
  getNeighborCoords,
  hexDistance,
  hexToCube,
} from './geometry.js';
import { normalizeHexId } from './parse.js';
import {
  displayHexId,
  formatHexId,
  parseHexId,
} from './parse.js';
import { compareHexCoords, compareHexIds, sortHexIds } from './sort.js';
import type { GridConfig, HexCoord, MapConfig } from './types.js';
import {
  isOutOfBounds,
  isValidHex,
  isValidHexFormat,
  isWithinGrid,
} from './validate.js';

describe('parseHexId', () => {
  describe('letter-number notation', () => {
    it('parses lowercase hex IDs', () => {
      expect(parseHexId('f12', 'letter-number')).toEqual({ col: 5, row: 11 });
      expect(parseHexId('a1', 'letter-number')).toEqual({ col: 0, row: 0 });
      expect(parseHexId('z26', 'letter-number')).toEqual({ col: 25, row: 25 });
    });

    it('parses uppercase hex IDs', () => {
      expect(parseHexId('F12', 'letter-number')).toEqual({ col: 5, row: 11 });
      expect(parseHexId('A1', 'letter-number')).toEqual({ col: 0, row: 0 });
    });

    it('throws for row zero', () => {
      expect(() => parseHexId('a0', 'letter-number')).toThrow(/row must be at least 1/);
    });

    it('throws for invalid format', () => {
      expect(() => parseHexId('aa1', 'letter-number')).toThrow(/Invalid hex ID/);
      expect(() => parseHexId('1a', 'letter-number')).toThrow(/Invalid hex ID/);
      expect(() => parseHexId('a', 'letter-number')).toThrow(/Invalid hex ID/);
      expect(() => parseHexId('12', 'letter-number')).toThrow(/Invalid hex ID/);
    });
  });

  describe('numeric notation', () => {
    it('parses 4-digit hex IDs', () => {
      expect(parseHexId('0312', 'numeric')).toEqual({ col: 2, row: 11 });
      expect(parseHexId('0101', 'numeric')).toEqual({ col: 0, row: 0 });
      expect(parseHexId('2627', 'numeric')).toEqual({ col: 25, row: 26 });
    });

    it('throws for column zero (00xx)', () => {
      expect(() => parseHexId('0012', 'numeric')).toThrow(/column must be at least 01/);
    });

    it('throws for row zero (xx00)', () => {
      expect(() => parseHexId('0100', 'numeric')).toThrow(/row must be at least 01/);
    });

    it('throws for invalid format', () => {
      expect(() => parseHexId('312', 'numeric')).toThrow(/Invalid hex ID/);
      expect(() => parseHexId('03120', 'numeric')).toThrow(/Invalid hex ID/);
      expect(() => parseHexId('ab12', 'numeric')).toThrow(/Invalid hex ID/);
    });
  });
});

describe('formatHexId', () => {
  it('formats to letter-number notation (lowercase)', () => {
    expect(formatHexId({ col: 5, row: 11 }, 'letter-number')).toBe('f12');
    expect(formatHexId({ col: 0, row: 0 }, 'letter-number')).toBe('a1');
    expect(formatHexId({ col: 25, row: 25 }, 'letter-number')).toBe('z26');
  });

  it('formats to numeric notation (zero-padded)', () => {
    expect(formatHexId({ col: 2, row: 11 }, 'numeric')).toBe('0312');
    expect(formatHexId({ col: 0, row: 0 }, 'numeric')).toBe('0101');
    expect(formatHexId({ col: 25, row: 26 }, 'numeric')).toBe('2627');
  });
});

describe('normalizeHexId', () => {
  it('normalizes letter-number to lowercase', () => {
    expect(normalizeHexId('F12', 'letter-number')).toBe('f12');
    expect(normalizeHexId('f12', 'letter-number')).toBe('f12');
    expect(normalizeHexId('A1', 'letter-number')).toBe('a1');
  });

  it('normalizes numeric notation', () => {
    expect(normalizeHexId('0312', 'numeric')).toBe('0312');
  });
});

describe('displayHexId', () => {
  it('uppercases letter-number notation', () => {
    expect(displayHexId('f12', 'letter-number')).toBe('F12');
    expect(displayHexId('a1', 'letter-number')).toBe('A1');
  });

  it('leaves numeric notation unchanged', () => {
    expect(displayHexId('0312', 'numeric')).toBe('0312');
  });
});

describe('isValidHexFormat', () => {
  describe('letter-number notation', () => {
    it('returns true for valid format', () => {
      expect(isValidHexFormat('a1', 'letter-number')).toBe(true);
      expect(isValidHexFormat('F12', 'letter-number')).toBe(true);
      expect(isValidHexFormat('z99', 'letter-number')).toBe(true);
    });

    it('returns false for row zero', () => {
      expect(isValidHexFormat('a0', 'letter-number')).toBe(false);
    });

    it('returns false for invalid format', () => {
      expect(isValidHexFormat('aa1', 'letter-number')).toBe(false);
      expect(isValidHexFormat('1a', 'letter-number')).toBe(false);
    });
  });

  describe('numeric notation', () => {
    it('returns true for valid format', () => {
      expect(isValidHexFormat('0101', 'numeric')).toBe(true);
      expect(isValidHexFormat('2627', 'numeric')).toBe(true);
    });

    it('returns false for column zero', () => {
      expect(isValidHexFormat('0012', 'numeric')).toBe(false);
    });

    it('returns false for row zero', () => {
      expect(isValidHexFormat('0100', 'numeric')).toBe(false);
    });
  });
});

describe('isWithinGrid', () => {
  const grid: GridConfig = { columns: 23, rows: 27, notation: 'letter-number' };

  it('returns true for valid coordinates', () => {
    expect(isWithinGrid({ col: 0, row: 0 }, grid)).toBe(true);
    expect(isWithinGrid({ col: 22, row: 26 }, grid)).toBe(true);
    expect(isWithinGrid({ col: 10, row: 15 }, grid)).toBe(true);
  });

  it('returns false for out-of-bounds coordinates', () => {
    expect(isWithinGrid({ col: -1, row: 0 }, grid)).toBe(false);
    expect(isWithinGrid({ col: 0, row: -1 }, grid)).toBe(false);
    expect(isWithinGrid({ col: 23, row: 0 }, grid)).toBe(false);
    expect(isWithinGrid({ col: 0, row: 27 }, grid)).toBe(false);
  });
});

describe('isOutOfBounds', () => {
  const outOfBounds = ['a1', 'b2', 'C3'];

  it('returns true for hexes in the out-of-bounds list', () => {
    expect(isOutOfBounds('a1', outOfBounds, 'letter-number')).toBe(true);
    expect(isOutOfBounds('A1', outOfBounds, 'letter-number')).toBe(true);
    expect(isOutOfBounds('b2', outOfBounds, 'letter-number')).toBe(true);
    expect(isOutOfBounds('c3', outOfBounds, 'letter-number')).toBe(true);
  });

  it('returns false for hexes not in the list', () => {
    expect(isOutOfBounds('d4', outOfBounds, 'letter-number')).toBe(false);
    expect(isOutOfBounds('a2', outOfBounds, 'letter-number')).toBe(false);
  });
});

describe('isValidHex', () => {
  const config: MapConfig = {
    grid: { columns: 23, rows: 27, notation: 'letter-number' },
    outOfBounds: ['a1', 'w27'],
  };

  it('returns true for valid hexes', () => {
    expect(isValidHex('a2', config)).toBe(true);
    expect(isValidHex('w26', config)).toBe(true);
    expect(isValidHex('L15', config)).toBe(true);
  });

  it('returns false for invalid format', () => {
    expect(isValidHex('aa1', config)).toBe(false);
  });

  it('returns false for out-of-grid hexes', () => {
    expect(isValidHex('x1', config)).toBe(false); // col 23, beyond 22
    expect(isValidHex('a28', config)).toBe(false); // row 27, beyond 26
  });

  it('returns false for out-of-bounds hexes', () => {
    expect(isValidHex('a1', config)).toBe(false);
    expect(isValidHex('w27', config)).toBe(false);
  });
});

describe('hexToCube', () => {
  it('converts offset coordinates to cube coordinates (even-q)', () => {
    // Origin (note: y may be -0 due to JS quirks, use == comparison)
    const origin = hexToCube({ col: 0, row: 0 });
    expect(origin.x).toBe(0);
    expect(origin.y == 0).toBe(true); // -0 == 0 in JS
    expect(origin.z).toBe(0);

    // Even column (col 0) - shifted down in even-q
    expect(hexToCube({ col: 0, row: 1 })).toEqual({ x: 0, y: -1, z: 1 });

    // Odd column (col 1) - not shifted in even-q
    // For even-q: z = row - (col + (col & 1)) / 2 = row - 1
    expect(hexToCube({ col: 1, row: 0 })).toEqual({ x: 1, y: 0, z: -1 });
    expect(hexToCube({ col: 1, row: 1 })).toEqual({ x: 1, y: -1, z: 0 });
  });

  it('maintains cube coordinate invariant x + y + z = 0', () => {
    const testCases: HexCoord[] = [
      { col: 0, row: 0 },
      { col: 5, row: 11 },
      { col: 22, row: 26 },
      { col: 10, row: 5 },
    ];

    for (const coord of testCases) {
      const cube = hexToCube(coord);
      expect(cube.x + cube.y + cube.z).toBe(0);
    }
  });
});

describe('hexDistance', () => {
  it('returns 0 for same hex', () => {
    expect(hexDistance({ col: 5, row: 11 }, { col: 5, row: 11 })).toBe(0);
  });

  it('returns 1 for adjacent hexes', () => {
    const center: HexCoord = { col: 5, row: 11 };
    const neighbors = getNeighborCoords(center);

    for (const neighbor of neighbors) {
      expect(hexDistance(center, neighbor)).toBe(1);
    }
  });

  it('calculates correct distance for non-adjacent hexes', () => {
    // Straight line east (same row, different column in even col)
    expect(hexDistance({ col: 0, row: 0 }, { col: 2, row: 0 })).toBe(2);

    // Diagonal movement
    expect(hexDistance({ col: 0, row: 0 }, { col: 2, row: 2 })).toBe(3);
  });
});

describe('getNeighborCoords', () => {
  it('returns exactly 6 neighbors', () => {
    expect(getNeighborCoords({ col: 5, row: 11 })).toHaveLength(6);
    expect(getNeighborCoords({ col: 0, row: 0 })).toHaveLength(6);
  });

  it('returns correct neighbors for even column', () => {
    const neighbors = getNeighborCoords({ col: 2, row: 5 });

    // Even column offsets (even-q): (-1,0), (0,-1), (+1,0), (+1,+1), (0,+1), (-1,+1)
    expect(neighbors).toContainEqual({ col: 1, row: 5 });
    expect(neighbors).toContainEqual({ col: 2, row: 4 });
    expect(neighbors).toContainEqual({ col: 3, row: 5 });
    expect(neighbors).toContainEqual({ col: 3, row: 6 });
    expect(neighbors).toContainEqual({ col: 2, row: 6 });
    expect(neighbors).toContainEqual({ col: 1, row: 6 });
  });

  it('returns correct neighbors for odd column', () => {
    const neighbors = getNeighborCoords({ col: 3, row: 5 });

    // Odd column offsets (even-q): (-1,-1), (0,-1), (+1,-1), (+1,0), (0,+1), (-1,0)
    expect(neighbors).toContainEqual({ col: 2, row: 4 });
    expect(neighbors).toContainEqual({ col: 3, row: 4 });
    expect(neighbors).toContainEqual({ col: 4, row: 4 });
    expect(neighbors).toContainEqual({ col: 4, row: 5 });
    expect(neighbors).toContainEqual({ col: 3, row: 6 });
    expect(neighbors).toContainEqual({ col: 2, row: 5 });
  });

  it('may return negative coordinates (no bounds filtering)', () => {
    const neighbors = getNeighborCoords({ col: 0, row: 0 });

    // Should include negative coordinates
    const hasNegative = neighbors.some((n) => n.col < 0 || n.row < 0);
    expect(hasNegative).toBe(true);
  });
});

describe('getHexesWithinDistance', () => {
  it('returns only center for distance 0', () => {
    const result = getHexesWithinDistance({ col: 5, row: 5 }, 0);
    expect(result).toHaveLength(1);
    expect(result).toContainEqual({ col: 5, row: 5 });
  });

  it('returns center + 6 neighbors for distance 1', () => {
    const result = getHexesWithinDistance({ col: 5, row: 5 }, 1);
    expect(result).toHaveLength(7); // 1 + 6
  });

  it('returns correct count for distance 2', () => {
    const result = getHexesWithinDistance({ col: 5, row: 5 }, 2);
    // Distance 2: 1 + 6 + 12 = 19 hexes
    expect(result).toHaveLength(19);
  });

  it('returns empty array for negative distance', () => {
    const result = getHexesWithinDistance({ col: 5, row: 5 }, -1);
    expect(result).toHaveLength(0);
  });

  it('all returned hexes are within specified distance', () => {
    const center: HexCoord = { col: 5, row: 5 };
    const distance = 3;
    const result = getHexesWithinDistance(center, distance);

    for (const hex of result) {
      expect(hexDistance(center, hex)).toBeLessThanOrEqual(distance);
    }
  });
});

describe('compareHexCoords', () => {
  it('sorts by column first', () => {
    expect(compareHexCoords({ col: 0, row: 5 }, { col: 1, row: 0 })).toBeLessThan(0);
    expect(compareHexCoords({ col: 2, row: 0 }, { col: 1, row: 5 })).toBeGreaterThan(0);
  });

  it('sorts by row when columns are equal', () => {
    expect(compareHexCoords({ col: 5, row: 0 }, { col: 5, row: 1 })).toBeLessThan(0);
    expect(compareHexCoords({ col: 5, row: 2 }, { col: 5, row: 1 })).toBeGreaterThan(0);
  });

  it('returns 0 for equal coordinates', () => {
    expect(compareHexCoords({ col: 5, row: 10 }, { col: 5, row: 10 })).toBe(0);
  });
});

describe('compareHexIds', () => {
  it('compares hex ID strings', () => {
    expect(compareHexIds('a1', 'b1', 'letter-number')).toBeLessThan(0);
    expect(compareHexIds('a2', 'a1', 'letter-number')).toBeGreaterThan(0);
    expect(compareHexIds('f12', 'F12', 'letter-number')).toBe(0);
  });
});

describe('sortHexIds', () => {
  it('sorts hex IDs by column then row', () => {
    const hexIds = ['b2', 'a1', 'b1', 'a2'];
    const sorted = sortHexIds([...hexIds], 'letter-number');
    expect(sorted).toEqual(['a1', 'a2', 'b1', 'b2']);
  });

  it('handles mixed case', () => {
    const hexIds = ['B2', 'a1', 'b1', 'A2'];
    const sorted = sortHexIds([...hexIds], 'letter-number');
    // Sorted by parsed coordinates (case-insensitive): a1 (0,0), A2 (0,1), b1 (1,0), B2 (1,1)
    expect(sorted).toEqual(['a1', 'A2', 'b1', 'B2']);
  });

  it('sorts numeric notation', () => {
    const hexIds = ['0202', '0101', '0201', '0102'];
    const sorted = sortHexIds([...hexIds], 'numeric');
    expect(sorted).toEqual(['0101', '0102', '0201', '0202']);
  });
});

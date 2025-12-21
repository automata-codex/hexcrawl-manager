# Flexible Map Configuration

## Overview

This specification defines changes to make the hex map system flexible and data-driven rather than hardcoded to specific dimensions. The goal is to support campaigns of varying sizes and shapes while eliminating the need for placeholder hex files.

### Current State

- Map dimensions are hardcoded (27 rows × 23 columns) in multiple places
- Every hex requires a data file, even empty placeholders
- Hexes reference their region via `regionId` field
- Region data files are optional and don't define membership
- Hex files are organized by region directory (e.g., `hexes/region-9/r14.yaml`)
- Coordinate parsing is scattered across multiple files with inconsistent handling

### Target State

- Map dimensions and out-of-bounds hexes defined in `map.yaml`
- Regions define which hexes they contain, plus default `terrain` and `biome`
- Hex files are optional—only needed when overriding region defaults or adding detail
- Hex files organized by column (e.g., `hexes/col-f/f12.yaml`)
- Centralized coordinate utilities with comprehensive tests
- Validation in prebuild phase catches configuration errors

### Key Design Decisions

| Aspect                       | Decision                                                                                    |
|------------------------------|---------------------------------------------------------------------------------------------|
| Map config location          | `map.yaml` in data directory root                                                           |
| Regions own hex membership   | Yes, hex list in region schema                                                              |
| Hex files                    | Optional, override region defaults                                                          |
| Region defaults              | `terrain` and `biome` fields on region                                                      |
| Coordinate notation          | Configurable: `letter-number` or `numeric`                                                  |
| Letter-number format         | Lowercase letter + unpadded number (`f2`)                                                   |
| Internal representation      | Zero-indexed `{col, row}` integers                                                          |
| Out-of-bounds                | Simple list in `map.yaml`                                                                   |
| Column limit (letter-number) | 26 (A-Z), by design                                                                         |
| Case handling                | Accept either case on input, normalize to lowercase internally, display as uppercase in CLI |
| Hex file organization        | By column directory                                                                         |

---

## Stage 1: Coordinate Utilities

Create centralized coordinate parsing, formatting, and validation utilities in `@achm/core`. This is foundational work that other stages depend on.

### Phase 1.1: Types and Constants

**File:** `packages/core/src/coordinates/types.ts`

```typescript
/**
 * Supported coordinate notation styles.
 * - letter-number: e.g., "f12", "A3" (columns A-Z, max 26 columns)
 * - numeric: e.g., "0312", "0103" (4-digit padded, CCRR format)
 */
export type CoordinateNotation = 'letter-number' | 'numeric';

/**
 * Internal representation of a hex coordinate.
 * Both values are zero-indexed.
 */
export interface HexCoord {
  col: number;
  row: number;
}

/**
 * Grid configuration from map.yaml
 */
export interface GridConfig {
  columns: number;
  rows: number;
  notation: CoordinateNotation;
}

/**
 * Full map configuration from map.yaml
 */
export interface MapConfig {
  grid: GridConfig;
  outOfBounds: string[];
}
```

**Commit message:** `feat(core): add coordinate system types`

### Phase 1.2: Parsing Functions

**File:** `packages/core/src/coordinates/parse.ts`

Implement the following functions:

```typescript
/**
 * Parse a hex ID string into internal coordinates.
 * Accepts either case for letter-number notation.
 *
 * @throws Error if format doesn't match expected notation
 *
 * Examples:
 *   parseHexId("f12", "letter-number") => { col: 5, row: 11 }
 *   parseHexId("F12", "letter-number") => { col: 5, row: 11 }
 *   parseHexId("0312", "numeric") => { col: 3, row: 12 }
 */
export function parseHexId(id: string, notation: CoordinateNotation): HexCoord;

/**
 * Format internal coordinates as a hex ID string.
 * Always outputs lowercase for letter-number notation.
 *
 * Examples:
 *   formatHexId({ col: 5, row: 11 }, "letter-number") => "f12"
 *   formatHexId({ col: 3, row: 12 }, "numeric") => "0312"
 */
export function formatHexId(coord: HexCoord, notation: CoordinateNotation): string;

/**
 * Normalize a hex ID to canonical lowercase form.
 * Used for internal storage and comparison.
 *
 * Examples:
 *   normalizeHexId("F12", "letter-number") => "f12"
 *   normalizeHexId("f12", "letter-number") => "f12"
 */
export function normalizeHexId(id: string, notation: CoordinateNotation): string;

/**
 * Format a hex ID for display (uppercase for letter-number).
 * Used in CLI output and user-facing displays.
 *
 * Examples:
 *   displayHexId("f12", "letter-number") => "F12"
 *   displayHexId("0312", "numeric") => "0312"
 */
export function displayHexId(id: string, notation: CoordinateNotation): string;
```

**Implementation notes:**
- Letter-number regex: `/^([a-zA-Z])(\d+)$/`
- Numeric regex: `/^(\d{2})(\d{2})$/` (first two digits = column, last two = row)
- For letter-number: column is `letter.toLowerCase().charCodeAt(0) - 97`, row is `parseInt(digits) - 1`
- For numeric: column is `parseInt(first two) - 1`, row is `parseInt(last two) - 1`

**Commit message:** `feat(core): add hex coordinate parsing functions`

### Phase 1.3: Validation Functions

**File:** `packages/core/src/coordinates/validate.ts`

```typescript
/**
 * Check if a string is a valid hex ID for the given notation.
 * Does not check grid bounds, only format.
 */
export function isValidHexFormat(id: string, notation: CoordinateNotation): boolean;

/**
 * Check if a coordinate is within the grid bounds.
 */
export function isWithinGrid(coord: HexCoord, grid: GridConfig): boolean;

/**
 * Check if a hex ID is in the out-of-bounds list.
 * Normalizes before comparison.
 */
export function isOutOfBounds(id: string, outOfBounds: string[], notation: CoordinateNotation): boolean;

/**
 * Comprehensive validation: valid format, within grid, not out-of-bounds.
 */
export function isValidHex(id: string, config: MapConfig): boolean;
```

**Commit message:** `feat(core): add hex coordinate validation functions`

### Phase 1.4: Geometry Functions

**File:** `packages/core/src/coordinates/geometry.ts`

Migrate and consolidate existing geometry functions:

```typescript
/**
 * Convert hex coordinates to cube coordinates for distance calculations.
 * Uses even-q offset with 0-indexed columns (A=0), where columns A, C, E... are shifted down.
 */
export function hexToCube(coord: HexCoord): { x: number; y: number; z: number };

/**
 * Calculate the distance between two hexes in hex steps.
 */
export function hexDistance(a: HexCoord, b: HexCoord): number;

/**
 * Get all neighboring hex coordinates.
 * Does not filter by grid bounds—caller should filter if needed.
 */
export function getNeighborCoords(coord: HexCoord): HexCoord[];

/**
 * Get all hex coordinates within a given distance.
 * Does not filter by grid bounds.
 */
export function getHexesWithinDistance(center: HexCoord, distance: number): HexCoord[];
```

**Note:** The interactive map uses even-q offset with 0-indexed columns (A=0, B=1, etc.), where columns A, C, E... are shifted down. The existing `getHexNeighbors` function has correct neighbor offsets but mislabeled direction comments ("Upper left", etc.). The existing `hexToCube` in `apply.ts` used the wrong formula (odd-q instead of even-q) but was close enough for distance-3 haven proximity checks. The new coordinate utilities use the correct even-q formulas.

**Commit message:** `feat(core): add hex geometry functions`

### Phase 1.5: Sorting Functions

**File:** `packages/core/src/coordinates/sort.ts`

```typescript
/**
 * Compare two hex coordinates for sorting.
 * Sorts by column first, then by row.
 */
export function compareCoords(a: HexCoord, b: HexCoord): number;

/**
 * Compare two hex ID strings for sorting.
 */
export function compareHexIds(a: string, b: string, notation: CoordinateNotation): number;

/**
 * Sort an array of hex IDs.
 */
export function sortHexIds(ids: string[], notation: CoordinateNotation): string[];
```

**Commit message:** `feat(core): add hex coordinate sorting functions`

### Phase 1.6: Barrel Export

**File:** `packages/core/src/coordinates/index.ts`

Export all public functions and types.

**File:** `packages/core/src/index.ts`

Add `export * from './coordinates';`

**Commit message:** `feat(core): export coordinate utilities from package`

### Phase 1.7: Unit Tests

**File:** `packages/core/src/coordinates/__tests__/parse.test.ts`

Test cases for parsing:

```typescript
describe('parseHexId', () => {
  describe('letter-number notation', () => {
    it('parses lowercase letter with single digit row', () => {
      expect(parseHexId('a1', 'letter-number')).toEqual({ col: 0, row: 0 });
    });

    it('parses lowercase letter with multi-digit row', () => {
      expect(parseHexId('f12', 'letter-number')).toEqual({ col: 5, row: 11 });
    });

    it('parses uppercase letter (case insensitive)', () => {
      expect(parseHexId('F12', 'letter-number')).toEqual({ col: 5, row: 11 });
    });

    it('parses last column (z)', () => {
      expect(parseHexId('z1', 'letter-number')).toEqual({ col: 25, row: 0 });
    });

    it('throws on invalid format (no letter)', () => {
      expect(() => parseHexId('123', 'letter-number')).toThrow();
    });

    it('throws on invalid format (no number)', () => {
      expect(() => parseHexId('abc', 'letter-number')).toThrow();
    });

    it('throws on invalid format (row zero)', () => {
      expect(() => parseHexId('a0', 'letter-number')).toThrow();
    });
  });

  describe('numeric notation', () => {
    it('parses 4-digit format', () => {
      expect(parseHexId('0101', 'numeric')).toEqual({ col: 0, row: 0 });
    });

    it('parses larger coordinates', () => {
      expect(parseHexId('1227', 'numeric')).toEqual({ col: 11, row: 26 });
    });

    it('throws on invalid format (too short)', () => {
      expect(() => parseHexId('123', 'numeric')).toThrow();
    });

    it('throws on invalid format (too long)', () => {
      expect(() => parseHexId('12345', 'numeric')).toThrow();
    });
  });
});

describe('formatHexId', () => {
  describe('letter-number notation', () => {
    it('formats as lowercase letter + unpadded number', () => {
      expect(formatHexId({ col: 5, row: 11 }, 'letter-number')).toBe('f12');
    });

    it('formats first column/row', () => {
      expect(formatHexId({ col: 0, row: 0 }, 'letter-number')).toBe('a1');
    });
  });

  describe('numeric notation', () => {
    it('formats with zero padding', () => {
      expect(formatHexId({ col: 0, row: 0 }, 'numeric')).toBe('0101');
    });

    it('formats larger coordinates', () => {
      expect(formatHexId({ col: 11, row: 26 }, 'numeric')).toBe('1227');
    });
  });
});

describe('normalizeHexId', () => {
  it('lowercases letter-number format', () => {
    expect(normalizeHexId('F12', 'letter-number')).toBe('f12');
  });

  it('preserves already lowercase', () => {
    expect(normalizeHexId('f12', 'letter-number')).toBe('f12');
  });
});

describe('displayHexId', () => {
  it('uppercases letter-number format', () => {
    expect(displayHexId('f12', 'letter-number')).toBe('F12');
  });

  it('preserves numeric format', () => {
    expect(displayHexId('0312', 'numeric')).toBe('0312');
  });
});
```

**File:** `packages/core/src/coordinates/__tests__/validate.test.ts`

```typescript
describe('isValidHexFormat', () => {
  it('accepts valid letter-number format', () => {
    expect(isValidHexFormat('f12', 'letter-number')).toBe(true);
    expect(isValidHexFormat('A1', 'letter-number')).toBe(true);
  });

  it('rejects invalid letter-number format', () => {
    expect(isValidHexFormat('123', 'letter-number')).toBe(false);
    expect(isValidHexFormat('aa1', 'letter-number')).toBe(false);
  });
});

describe('isWithinGrid', () => {
  const grid: GridConfig = { columns: 23, rows: 27, notation: 'letter-number' };

  it('accepts coordinates within bounds', () => {
    expect(isWithinGrid({ col: 0, row: 0 }, grid)).toBe(true);
    expect(isWithinGrid({ col: 22, row: 26 }, grid)).toBe(true);
  });

  it('rejects coordinates outside bounds', () => {
    expect(isWithinGrid({ col: 23, row: 0 }, grid)).toBe(false);
    expect(isWithinGrid({ col: 0, row: 27 }, grid)).toBe(false);
    expect(isWithinGrid({ col: -1, row: 0 }, grid)).toBe(false);
  });
});
```

**File:** `packages/core/src/coordinates/__tests__/geometry.test.ts`

```typescript
describe('hexDistance', () => {
  it('returns 0 for same hex', () => {
    expect(hexDistance({ col: 5, row: 5 }, { col: 5, row: 5 })).toBe(0);
  });

  it('returns 1 for adjacent hexes', () => {
    // Test all 6 neighbors of a hex
    const center = { col: 5, row: 5 };
    const neighbors = getNeighborCoords(center);
    neighbors.forEach(neighbor => {
      expect(hexDistance(center, neighbor)).toBe(1);
    });
  });

  it('calculates correct distance for distant hexes', () => {
    expect(hexDistance({ col: 0, row: 0 }, { col: 3, row: 0 })).toBe(3);
  });
});

describe('getNeighborCoords', () => {
  it('returns 6 neighbors', () => {
    expect(getNeighborCoords({ col: 5, row: 5 })).toHaveLength(6);
  });

  it('handles odd column offset correctly', () => {
    // Odd column indices (B, D, F...) are not shifted in even-q
    const neighbors = getNeighborCoords({ col: 5, row: 5 });
    // Verify expected neighbor positions for even-q grid with 0-indexed columns
  });

  it('handles even column offset correctly', () => {
    const neighbors = getNeighborCoords({ col: 4, row: 5 });
    // Verify expected neighbor positions for even column
  });
});
```

**Commit message:** `test(core): add coordinate utility tests`

### Phase 1.8: Migrate Existing Code

Update existing code to use the new coordinate utilities. Files to update:

1. `packages/core/src/hexes/get-hex-neighbors.ts` - use `getNeighborCoords`, remove hardcoded bounds
2. `packages/core/src/hexes/hex-sort.ts` - delegate to new sorting functions
3. `apps/web/src/utils/hexes.ts` - use new `parseHexId`
4. `apps/cli/src/commands/weave/lib/apply.ts` - use new `hexToCube`, `hexDistance`

For each file:
- Import from `@achm/core` coordinates module
- Replace inline implementations with calls to shared functions
- Remove hardcoded grid bounds where present
- Update any callers if signatures change

**Commit message:** `refactor: migrate existing code to use coordinate utilities`

**Note:** The migrated code currently hardcodes `'letter-number'` notation for backwards compatibility. Once `map.yaml` is loadable (Stage 2), these callsites should be updated to use `config.grid.notation` instead. Affected locations:
- `packages/core/src/hexes/get-hex-neighbors.ts`
- `packages/core/src/hexes/hex-sort.ts`
- `apps/web/src/utils/hexes.ts`
- `apps/cli/src/commands/weave/lib/apply.ts`

---

## Stage 2: Map Configuration Schema

Define and implement the `map.yaml` configuration file.

### Phase 2.1: Zod Schema

**File:** `packages/schemas/src/map-config.ts`

```typescript
import { z } from 'zod';

export const GridConfigSchema = z.object({
  columns: z.number().int().positive().max(26),
  rows: z.number().int().positive(),
  notation: z.enum(['letter-number', 'numeric']).default('letter-number'),
});

export const MapConfigSchema = z.object({
  grid: GridConfigSchema,
  outOfBounds: z.array(z.string()).default([]),
});

export type GridConfigData = z.infer<typeof GridConfigSchema>;
export type MapConfigData = z.infer<typeof MapConfigSchema>;
```

**Commit message:** `feat(schemas): add map configuration schema`

### Phase 2.2: Content Collection Definition

**File:** Add to appropriate Astro content config

Register `map.yaml` as a singleton data file (not a collection). It should be loaded once at build time and made available globally.

**Implementation approach:**
- Load `map.yaml` from data directory root during content collection setup
- Parse and validate against `MapConfigSchema`
- Export as a module that other code can import

**Note:** The exact mechanism depends on how other singleton configs are handled in the codebase. Follow existing patterns.

**Commit message:** `feat(web): register map.yaml content collection`

### Phase 2.3: Sample Data File

**File:** `data/map.yaml` (for the existing campaign)

```yaml
grid:
  columns: 23
  rows: 27
  notation: letter-number
outOfBounds: []
```

This matches current dimensions. Out-of-bounds list is empty since current data covers the full rectangle.

**Commit message:** `data: add map.yaml configuration`

---

## Stage 3: Region Schema Update

Update region schema to own hex membership and provide defaults.

### Phase 3.1: Update Region Zod Schema

**File:** `packages/schemas/src/region.ts` (or equivalent)

Add new fields to the region schema:

```typescript
// Add to existing RegionSchema
hexes: z.array(z.string()).optional(),  // List of hex IDs in this region
terrain: z.string().optional(),          // Default terrain for hexes
biome: z.string().optional(),            // Default biome for hexes
```

**Validation notes:**
- `hexes` is optional during migration period—existing regions won't have it
- Once migration is complete, we can make it required
- `terrain` and `biome` should use the same enum/values as hex terrain/biome

**Commit message:** `feat(schemas): add hex membership and defaults to region schema`

### Phase 3.2: Update Hex Zod Schema

**File:** `packages/schemas/src/hex.ts` (or equivalent)

Make fields optional that will be derived from region:

```typescript
// These become optional (derived from region if not specified)
regionId: z.string().optional(),  // Deprecated, will be removed
terrain: z.string().optional(),   // Optional, falls back to region default
biome: z.string().optional(),     // Optional, falls back to region default
```

**Commit message:** `feat(schemas): make hex terrain/biome optional for region fallback`

---

## Stage 4: Prebuild Validation

Add validation scripts that run during the prebuild phase.

### Phase 4.1: Map Validation Script

**File:** `scripts/prebuild/validate-map.ts`

This script validates the map configuration and hex/region consistency:

```typescript
interface ValidationResult {
  errors: string[];
  warnings: string[];
}

function validateMap(): ValidationResult {
  const result: ValidationResult = { errors: [], warnings: [] };

  // Load map.yaml
  const mapConfig = loadMapConfig();

  // Load all regions
  const regions = loadAllRegions();

  // Load all hex files
  const hexFiles = loadAllHexFiles();

  // Build set of all valid hex IDs from grid config
  const allGridHexes = new Set<string>();
  for (let col = 0; col < mapConfig.grid.columns; col++) {
    for (let row = 0; row < mapConfig.grid.rows; row++) {
      const id = formatHexId({ col, row }, mapConfig.grid.notation);
      if (!isOutOfBounds(id, mapConfig.outOfBounds, mapConfig.grid.notation)) {
        allGridHexes.add(id);
      }
    }
  }

  // Build map of hex -> region assignments
  const hexToRegion = new Map<string, string[]>();
  for (const region of regions) {
    if (!region.hexes) continue;
    for (const hexId of region.hexes) {
      const normalized = normalizeHexId(hexId, mapConfig.grid.notation);

      // Validate hex ID format
      if (!isValidHexFormat(hexId, mapConfig.grid.notation)) {
        result.errors.push(`Region ${region.id}: Invalid hex ID format "${hexId}"`);
        continue;
      }

      // Validate hex is in grid
      if (!allGridHexes.has(normalized)) {
        result.errors.push(`Region ${region.id}: Hex "${hexId}" is outside grid or out-of-bounds`);
        continue;
      }

      // Track assignment
      const existing = hexToRegion.get(normalized) || [];
      existing.push(region.id);
      hexToRegion.set(normalized, existing);
    }
  }

  // Check for multi-region assignments
  for (const [hexId, regions] of hexToRegion) {
    if (regions.length > 1) {
      result.errors.push(`Hex ${hexId} assigned to multiple regions: ${regions.join(', ')}`);
    }
  }

  // Check for unassigned hexes (warning, not error)
  for (const hexId of allGridHexes) {
    if (!hexToRegion.has(hexId)) {
      result.warnings.push(`Hex ${hexId} is not assigned to any region`);
    }
  }

  // Validate hex files reference valid coordinates
  for (const hexFile of hexFiles) {
    const normalized = normalizeHexId(hexFile.id, mapConfig.grid.notation);
    if (!allGridHexes.has(normalized)) {
      result.errors.push(`Hex file ${hexFile.path}: ID "${hexFile.id}" is outside grid or out-of-bounds`);
    }
  }

  // Validate region defaults
  for (const region of regions) {
    if (region.hexes && region.hexes.length > 0) {
      if (!region.terrain) {
        result.warnings.push(`Region ${region.id} has hexes but no default terrain`);
      }
      if (!region.biome) {
        result.warnings.push(`Region ${region.id} has hexes but no default biome`);
      }
    }
  }

  return result;
}
```

**Exit behavior:**
- Errors: Exit with code 1, fail the build
- Warnings only: Exit with code 0, print warnings

**Integration:**
- Add to `prebuild` script in appropriate package.json
- Runs before Astro build

**Commit message:** `feat(scripts): add map validation prebuild script`

### Phase 4.2: Integrate with Existing Prebuild

Update the prebuild pipeline to include map validation. Follow existing patterns for how other validation scripts are integrated.

**Commit message:** `chore: integrate map validation into prebuild`

---

## Stage 5: Data Derivation

Update the data loading layer to derive hex information from regions when hex files don't exist.

### Phase 5.1: Hex Resolution Utility

**File:** `packages/core/src/hexes/resolve-hex.ts`

```typescript
import type { HexData, RegionData, MapConfigData } from '@achm/schemas';

interface ResolvedHex {
  id: string;
  terrain: string;
  biome: string;
  regionId: string;
  // ... other fields with defaults
  hasDataFile: boolean;  // Useful for debugging/display
}

/**
 * Resolve hex data, falling back to region defaults.
 *
 * @param hexId - The hex ID to resolve
 * @param hexFile - The hex data file contents, if one exists
 * @param region - The region this hex belongs to
 * @param mapConfig - The map configuration
 */
export function resolveHex(
  hexId: string,
  hexFile: HexData | undefined,
  region: RegionData,
  mapConfig: MapConfigData
): ResolvedHex {
  const normalized = normalizeHexId(hexId, mapConfig.grid.notation);

  return {
    id: normalized,
    terrain: hexFile?.terrain ?? region.terrain ?? 'unknown',
    biome: hexFile?.biome ?? region.biome ?? 'unknown',
    regionId: region.id,
    // Copy other fields from hexFile if present, otherwise use defaults
    landmark: hexFile?.landmark,
    hiddenSites: hexFile?.hiddenSites ?? [],
    notes: hexFile?.notes ?? [],
    // ... etc
    hasDataFile: hexFile !== undefined,
  };
}

/**
 * Generate the complete hex list from regions and map config.
 * Returns resolved hex data for every valid grid hex.
 */
export function resolveAllHexes(
  hexFiles: Map<string, HexData>,
  regions: RegionData[],
  mapConfig: MapConfigData
): ResolvedHex[] {
  // Build region lookup by hex ID
  const hexToRegion = new Map<string, RegionData>();
  for (const region of regions) {
    if (!region.hexes) continue;
    for (const hexId of region.hexes) {
      const normalized = normalizeHexId(hexId, mapConfig.grid.notation);
      hexToRegion.set(normalized, region);
    }
  }

  const results: ResolvedHex[] = [];

  // Iterate all grid hexes
  for (let col = 0; col < mapConfig.grid.columns; col++) {
    for (let row = 0; row < mapConfig.grid.rows; row++) {
      const id = formatHexId({ col, row }, mapConfig.grid.notation);

      // Skip out-of-bounds
      if (isOutOfBounds(id, mapConfig.outOfBounds, mapConfig.grid.notation)) {
        continue;
      }

      const region = hexToRegion.get(id);
      if (!region) {
        // Unassigned hex - skip or handle as "unknown region"
        // This should be caught by validation, but handle gracefully
        continue;
      }

      const hexFile = hexFiles.get(id);
      results.push(resolveHex(id, hexFile, region, mapConfig));
    }
  }

  return results;
}
```

**Commit message:** `feat(core): add hex resolution with region fallback`

### Phase 5.2: Update Content Collection Loaders

Update the Astro content collection loaders and API endpoints to use `resolveAllHexes` instead of directly iterating hex files.

**Files to update:**
- `apps/web/src/pages/api/hexes.json.ts`
- Any other hex data loaders

**Commit message:** `feat(web): use hex resolution for API endpoints`

### Phase 5.3: Update Interactive Map

The interactive map should already work since it consumes the API, but verify:
- Hexes without data files render correctly with region defaults
- Out-of-bounds hexes don't render
- Grid bounds are respected

**Commit message:** `fix(web): verify interactive map works with resolved hexes`

---

## Stage 6: Data Migration

Migrate existing data to the new structure.

### Phase 6.1: Migration Script - Generate Region Hex Lists

**File:** `scripts/one-time-scripts/migrate-region-hexes.ts`

This script reads all existing hex files, groups them by `regionId`, and updates region files with `hexes` arrays.

```typescript
async function migrateRegionHexes(dryRun: boolean) {
  // Load all hex files
  const hexFiles = await loadAllHexFiles();

  // Group by regionId
  const hexesByRegion = new Map<string, string[]>();
  for (const hex of hexFiles) {
    const regionId = hex.regionId;
    if (!regionId) {
      console.warn(`Hex ${hex.id} has no regionId`);
      continue;
    }
    const list = hexesByRegion.get(regionId) || [];
    list.push(normalizeHexId(hex.id, 'letter-number'));
    hexesByRegion.set(regionId, list);
  }

  // Load existing region files
  const regions = await loadAllRegions();

  // Update each region
  for (const region of regions) {
    const hexes = hexesByRegion.get(region.id) || [];
    if (hexes.length === 0) {
      console.log(`Region ${region.id}: no hexes found`);
      continue;
    }

    // Sort hexes for consistent ordering
    hexes.sort((a, b) => compareHexIds(a, b, 'letter-number'));

    // Determine default terrain/biome (most common values)
    const terrainCounts = new Map<string, number>();
    const biomeCounts = new Map<string, number>();
    for (const hexId of hexes) {
      const hex = hexFiles.find(h => normalizeHexId(h.id, 'letter-number') === hexId);
      if (hex?.terrain) {
        terrainCounts.set(hex.terrain, (terrainCounts.get(hex.terrain) || 0) + 1);
      }
      if (hex?.biome) {
        biomeCounts.set(hex.biome, (biomeCounts.get(hex.biome) || 0) + 1);
      }
    }

    const defaultTerrain = getMostCommon(terrainCounts);
    const defaultBiome = getMostCommon(biomeCounts);

    console.log(`Region ${region.id}:`);
    console.log(`  Hexes: ${hexes.length}`);
    console.log(`  Default terrain: ${defaultTerrain}`);
    console.log(`  Default biome: ${defaultBiome}`);

    if (!dryRun) {
      // Update region file
      await updateRegionFile(region.id, {
        hexes,
        terrain: defaultTerrain,
        biome: defaultBiome,
      });
    }
  }
}

function getMostCommon(counts: Map<string, number>): string | undefined {
  let maxCount = 0;
  let maxKey: string | undefined;
  for (const [key, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxKey = key;
    }
  }
  return maxKey;
}
```

**Commit message:** `chore(migration): add script to populate region hex lists`

### Phase 6.2: Migration Script - Reorganize Hex Files by Column

**File:** `scripts/one-time-scripts/reorganize-hexes-by-column.ts`

Move hex files from `hexes/region-X/` to `hexes/col-X/` structure.

```typescript
async function reorganizeHexesByColumn(dryRun: boolean) {
  const hexDir = getDataPath('hexes');

  // Find all hex files
  const hexFiles = await findAllHexFiles(hexDir);

  for (const file of hexFiles) {
    const hexId = path.basename(file.path, '.yaml');
    const coord = parseHexId(hexId, 'letter-number');
    const colLetter = String.fromCharCode(97 + coord.col); // 'a', 'b', etc.
    const newDir = path.join(hexDir, `col-${colLetter}`);
    const newPath = path.join(newDir, path.basename(file.path));

    console.log(`${file.path} -> ${newPath}`);

    if (!dryRun) {
      await fs.mkdir(newDir, { recursive: true });
      await fs.rename(file.path, newPath);
    }
  }

  if (!dryRun) {
    // Remove empty region directories
    await removeEmptyDirs(hexDir);
  }
}
```

**Commit message:** `chore(migration): add script to reorganize hexes by column`

### Phase 6.3: Migration Script - Remove regionId from Hex Files

**File:** `scripts/one-time-scripts/remove-hex-region-ids.ts`

Remove the now-redundant `regionId` field from hex files.

```typescript
async function removeHexRegionIds(dryRun: boolean) {
  const hexFiles = await loadAllHexFiles();

  for (const file of hexFiles) {
    if (!file.data.regionId) continue;

    console.log(`Removing regionId from ${file.path}`);

    if (!dryRun) {
      const { regionId, ...rest } = file.data;
      await writeYamlFile(file.path, rest);
    }
  }
}
```

**Commit message:** `chore(migration): add script to remove regionId from hex files`

### Phase 6.4: ~~Migration Script - Remove Placeholder Hexes~~ (SKIPPED)

**Status:** Deliberately skipped.

**Rationale:** The existing hex files with placeholder content (`name: unknown`, `landmark: unknown`) serve as visible TODO markers for hexes that need content. Since the campaign goal is to eventually give every hex unique name and landmark values, keeping these placeholders provides a clear indication of which hexes still need work. Removing them would mean creating new files from scratch when adding content, rather than editing existing stubs in place.

The terrain/biome fields in these placeholders are now redundant with region defaults but are harmless—they simply confirm the fallback values.

### Phase 6.5: Run Migration

Execute the migration scripts in order:

1. `migrate-region-hexes.ts` - Populate region hex lists
2. `reorganize-hexes-by-column.ts` - Move files to column directories
3. `remove-hex-region-ids.ts` - Clean up redundant field

Run each with `--dry-run` first to verify, then without for actual migration.

**Commit message:** `data: migrate hex data to new structure`

### Phase 6.6: Update Content Collection Config

Update Astro content collection configuration to look for hex files in `hexes/col-*/` instead of `hexes/region-*/`.

**Commit message:** `feat(web): update hex content collection for column-based organization`

### Phase 6.7: Finalize Schema - Make hexes Required

After migration is complete and verified, update the region schema to make `hexes` required:

```typescript
hexes: z.array(z.string()),  // Now required
```

Remove `regionId` from hex schema entirely.

**Commit message:** `feat(schemas): make region.hexes required, remove hex.regionId`

---

## Stage 7: Interactive Map Rendering Updates

Ensure the interactive map correctly handles the new data model.

### Phase 7.1: Handle Out-of-Bounds Visualization

Update the map to visually distinguish:
- **In-bounds, assigned hexes**: Normal rendering
- **In-bounds, unassigned hexes**: Should not occur after validation, but handle gracefully
- **Out-of-bounds hexes**: Don't render at all (void space)

The current implementation already only renders hexes that exist in the data, so out-of-bounds should "just work" once they're excluded from the resolved hex list.

**Commit message:** `feat(web): verify out-of-bounds hex handling in map`

### Phase 7.2: Update ViewBox Calculation

The map viewBox should be calculated from the actual hex data rather than hardcoded dimensions. This may already be the case—verify and fix if needed.

```typescript
function calculateMapBounds(hexes: ResolvedHex[]): { minX, minY, maxX, maxY } {
  // Calculate pixel bounds from hex positions
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const hex of hexes) {
    const coord = parseHexId(hex.id, notation);
    const { x, y } = axialToPixel(coord.col, coord.row);
    minX = Math.min(minX, x - HEX_WIDTH / 2);
    maxX = Math.max(maxX, x + HEX_WIDTH / 2);
    minY = Math.min(minY, y - HEX_HEIGHT / 2);
    maxY = Math.max(maxY, y + HEX_HEIGHT / 2);
  }

  return { minX, minY, maxX, maxY };
}
```

**Commit message:** `feat(web): calculate map viewBox from hex data`

---

## Testing Strategy

### Unit Tests (Stage 1)
- All coordinate parsing, formatting, validation functions
- Geometry functions (distance, neighbors)
- Sorting functions

### Integration Tests
- Validation script with sample invalid configurations
- Hex resolution with missing hex files
- Migration scripts with sample data

### Manual Testing
- Interactive map renders correctly after migration
- CLI tools work with new coordinate utilities
- Prebuild validation catches expected errors

---

## Rollback Plan

If issues are discovered after migration:

1. **Stage 1-4** (utilities and validation): No data changes, safe to revert code
2. **Stage 5** (derivation): Can revert to direct hex file loading
3. **Stage 6** (migration): Keep backup of original data directory structure; git history preserves original state

Recommend creating a git tag before Stage 6 migration: `git tag pre-hex-migration`

---

## Open Questions

1. **Sample data for open source**: Should we create a minimal sample `map.yaml` and region/hex structure for the public repo? → Separate task.

2. **Graceful degradation**: If `map.yaml` is missing, should the system fall back to inferring bounds from hex files, or fail hard? → Fail hard with clear error message directing user to create `map.yaml`.

3. **CLI coordinate display**: Should all CLI output use uppercase (F12) or match the input case? → Uppercase for consistency.

4. **Neighbor direction labels**: ~~The existing `getHexNeighbors` has direction labels in comments that may not match actual geometry.~~ **Resolved:** The map uses even-q offset with 0-indexed columns. The neighbor offsets are correct; only the direction label comments are wrong. The new coordinate utilities use the correct even-q formulas.

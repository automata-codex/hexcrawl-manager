import type { HexData, MapConfig, RegionData } from '@achm/schemas';

import { formatHexId, isOutOfBounds } from '../coordinates/index.js';
import { normalizeHexId } from '../coordinates/parse.js';

/**
 * Resolved hex data with all fields populated (from hex file or region defaults).
 */
export interface ResolvedHex {
  id: string;
  terrain: string;
  biome: string;
  regionId: string;
  /** True if a hex data file exists for this hex */
  hasDataFile: boolean;
  /** The original hex data if a file exists */
  hexData?: HexData;
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
  mapConfig: MapConfig,
): ResolvedHex {
  const normalized = normalizeHexId(hexId, mapConfig.grid.notation);

  return {
    id: normalized,
    terrain: hexFile?.terrain ?? region.terrain ?? 'unknown',
    biome: hexFile?.biome ?? region.biome ?? 'unknown',
    regionId: region.id,
    hasDataFile: hexFile !== undefined,
    hexData: hexFile,
  };
}

/**
 * Build a lookup map from hex ID to region.
 */
export function buildHexToRegionMap(
  regions: RegionData[],
  mapConfig: MapConfig,
): Map<string, RegionData> {
  const hexToRegion = new Map<string, RegionData>();
  for (const region of regions) {
    if (!region.hexes) continue;
    for (const hexId of region.hexes) {
      const normalized = normalizeHexId(hexId, mapConfig.grid.notation);
      hexToRegion.set(normalized, region);
    }
  }
  return hexToRegion;
}

/**
 * Generate the complete hex list from regions and map config.
 * Returns resolved hex data for every valid grid hex that is assigned to a region.
 *
 * @param hexFiles - Map of normalized hex ID to hex data
 * @param regions - All region data
 * @param mapConfig - The map configuration
 */
export function resolveAllHexes(
  hexFiles: Map<string, HexData>,
  regions: RegionData[],
  mapConfig: MapConfig,
): ResolvedHex[] {
  const { grid, outOfBounds } = mapConfig;
  const notation = grid.notation;

  // Build region lookup by hex ID
  const hexToRegion = buildHexToRegionMap(regions, mapConfig);

  const results: ResolvedHex[] = [];

  // Iterate all grid hexes
  for (let col = 0; col < grid.columns; col++) {
    for (let row = 0; row < grid.rows; row++) {
      const id = formatHexId({ col, row }, notation);

      // Skip out-of-bounds
      if (isOutOfBounds(id, outOfBounds, notation)) {
        continue;
      }

      const region = hexToRegion.get(id);
      if (!region) {
        // Unassigned hex - skip
        // This should be caught by validation, but handle gracefully
        continue;
      }

      const hexFile = hexFiles.get(id);
      results.push(resolveHex(id, hexFile, region, mapConfig));
    }
  }

  return results;
}

/**
 * Resolve a single hex by ID, looking up its region.
 * Returns undefined if the hex is not assigned to any region.
 *
 * @param hexId - The hex ID to resolve
 * @param hexFiles - Map of normalized hex ID to hex data
 * @param regions - All region data
 * @param mapConfig - The map configuration
 */
export function resolveHexById(
  hexId: string,
  hexFiles: Map<string, HexData>,
  regions: RegionData[],
  mapConfig: MapConfig,
): ResolvedHex | undefined {
  const normalized = normalizeHexId(hexId, mapConfig.grid.notation);
  const hexToRegion = buildHexToRegionMap(regions, mapConfig);
  const region = hexToRegion.get(normalized);

  if (!region) {
    return undefined;
  }

  const hexFile = hexFiles.get(normalized);
  return resolveHex(normalized, hexFile, region, mapConfig);
}

import { getCollection } from 'astro:content';

import { getCurrentUserRole } from '../../utils/auth.ts';
import { SECURITY_ROLE, UNKNOWN_CONTENT } from '../../utils/constants.ts';
import { processHex } from '../../utils/hexes.ts';
import { buildHexToRegionLookup } from '../../utils/regions.ts';

import type { ExtendedHexData } from '../../types.ts';
import type { HexData } from '@achm/schemas';
import type { APIRoute } from 'astro';

export type HexPlayerData = Pick<
  ExtendedHexData,
  | 'id'
  | 'name'
  | 'landmark'
  | 'regionId'
  | 'topography'
  | 'isVisited'
  | 'isExplored'
  | 'isScouted'
  | 'renderedLandmark'
  | 'tags'
> & {
  hasHiddenSites: boolean;
  terrain: ExtendedHexData['terrain'] | 'Unknown';
  biome: ExtendedHexData['biome'] | 'Unknown';
};

/**
 * Apply region fallbacks to hex data.
 * Derives regionId from region ownership and provides terrain/biome defaults.
 */
function resolveHexData(
  hex: HexData,
  hexToRegion: Map<string, { id: string; data: { terrain?: string; biome?: string } }>,
): HexData {
  const region = hexToRegion.get(hex.id.toLowerCase());

  return {
    ...hex,
    // Use region as authoritative source for regionId
    regionId: region?.id ?? hex.regionId,
    // Fall back to region defaults for terrain/biome
    terrain: hex.terrain ?? region?.data.terrain,
    biome: hex.biome ?? region?.data.biome,
  };
}

export const GET: APIRoute = async ({ locals }) => {
  const [hexEntries, regionEntries] = await Promise.all([
    getCollection('hexes'),
    getCollection('regions'),
  ]);

  // Build region lookup for resolution
  const hexToRegion = buildHexToRegionLookup(regionEntries);

  // Resolve each hex with region fallbacks
  const fullHexes = hexEntries.map((entry) =>
    resolveHexData(entry.data, hexToRegion),
  );

  const role = getCurrentUserRole(locals);

  const hexes: HexPlayerData[] = await Promise.all(
    fullHexes.map(async (hex) => {
      const data = await processHex(hex);
      const hasHiddenSites = data.renderedHiddenSites.length > 0;

      if (role === SECURITY_ROLE.GM) {
        return { ...data, hasHiddenSites };
      }

      // Redact fields for players
      if (hex.isVisited) {
        return {
          id: data.id,
          name: data.name,
          landmark: data.landmark,
          regionId: data.regionId,
          terrain: data.terrain,
          biome: data.biome,
          topography: data.topography,
          isVisited: data.isVisited,
          isExplored: data.isExplored,
          renderedLandmark: data.renderedLandmark,
          hasHiddenSites,
        };
      }

      if (hex.isScouted) {
        return {
          id: data.id,
          name: data.tags?.includes('landmark-known')
            ? data.name
            : UNKNOWN_CONTENT,
          landmark: data.tags?.includes('landmark-known')
            ? data.landmark
            : UNKNOWN_CONTENT,
          regionId: data.regionId,
          terrain: data.terrain,
          biome: data.biome,
          topography: data.topography,
          isVisited: data.isVisited,
          isExplored: data.isExplored,
          isScouted: data.isScouted,
          renderedLandmark: data.tags?.includes('landmark-known')
            ? data.renderedLandmark
            : UNKNOWN_CONTENT,
          hasHiddenSites,
        };
      }

      return {
        id: data.id,
        name: UNKNOWN_CONTENT,
        landmark: UNKNOWN_CONTENT,
        regionId: data.regionId,
        terrain: UNKNOWN_CONTENT,
        biome: UNKNOWN_CONTENT,
        isVisited: data.isVisited,
        isExplored: data.isExplored,
        renderedLandmark: UNKNOWN_CONTENT,
        hasHiddenSites,
      };
    }),
  );

  return new Response(JSON.stringify(hexes), {
    headers: { 'Content-Type': 'application/json' },
  });
};

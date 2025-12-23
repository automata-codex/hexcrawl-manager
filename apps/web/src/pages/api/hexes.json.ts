import { isOutOfBounds, normalizeHexId } from '@achm/core';
import { loadMapConfig } from '@achm/data';
import { getCollection } from 'astro:content';

import { getCurrentUserRole } from '../../utils/auth.ts';
import { SECURITY_ROLE, UNKNOWN_CONTENT } from '../../utils/constants.ts';
import { createSyntheticHex, processHex, resolveHexWithRegion } from '../../utils/hexes.ts';
import { buildHexToRegionLookup, getAllRegionHexIds } from '../../utils/regions.ts';

import type { ExtendedHexData } from '../../types.ts';
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

export const GET: APIRoute = async ({ locals }) => {
  const [hexEntries, regionEntries] = await Promise.all([
    getCollection('hexes'),
    getCollection('regions'),
  ]);

  // Load map config for out-of-bounds filtering and notation
  const mapConfig = loadMapConfig();
  const outOfBoundsList = mapConfig.outOfBounds ?? [];
  const notation = mapConfig.grid.notation;

  // Build region lookup for resolution
  const hexToRegion = buildHexToRegionLookup(regionEntries, notation);

  // Get all hex IDs from regions and identify those without individual files
  const allRegionHexIds = getAllRegionHexIds(regionEntries, notation);
  const hexFileIds = new Set(
    hexEntries.map((e) => normalizeHexId(e.data.id, notation)),
  );

  // Create synthetic hex data for region hexes without files
  const syntheticHexes = [...allRegionHexIds]
    .filter((hexId) => !hexFileIds.has(hexId))
    .map((hexId) => {
      const region = hexToRegion.get(hexId)!;
      return createSyntheticHex(hexId, region.data);
    });

  // Combine file-based and synthetic hexes, filter out-of-bounds, resolve with region data
  const allHexData = [
    ...hexEntries.map((e) => e.data),
    ...syntheticHexes,
  ];

  const fullHexes = allHexData
    .filter((hex) => !isOutOfBounds(hex.id, outOfBoundsList, notation))
    .map((hex) => {
      const region = hexToRegion.get(normalizeHexId(hex.id, notation));
      return resolveHexWithRegion(hex, region);
    });

  const role = getCurrentUserRole(locals);

  const hexes: HexPlayerData[] = await Promise.all(
    fullHexes.map(async (hex) => {
      const data = await processHex(hex);
      const hasHiddenSites = data.renderedHiddenSites.length > 0;

      if (role === SECURITY_ROLE.GM) {
        // GM gets full data - type assertion needed as we return superset of HexPlayerData
        return { ...data, hasHiddenSites } as HexPlayerData;
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

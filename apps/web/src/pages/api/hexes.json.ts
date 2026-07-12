import {
  isOutOfBounds,
  normalizeHexId,
  sortIgnoringArticles,
} from '@achm/core';
import { loadMapConfig } from '@achm/data';
import { getCollection } from 'astro:content';

import { getCurrentUserRole } from '../../utils/auth.ts';
import {
  LOST_VALLEY_BARRIER_TAG,
  SECURITY_ROLE,
  UNKNOWN_CONTENT,
} from '../../utils/constants.ts';
import {
  createSyntheticHex,
  processHex,
  resolveHexWithRegion,
} from '../../utils/hexes.ts';
import {
  buildHexToRegionLookup,
  getAllRegionHexIds,
} from '../../utils/regions.ts';

import type { ExtendedHexData, RoleplayBookMapEntry } from '../../types.ts';
import type { APIRoute } from 'astro';

export type HexPlayerData = Pick<
  ExtendedHexData,
  | 'id'
  | 'name'
  | 'landmark'
  | 'regionId'
  | 'regionName'
  | 'topography'
  | 'isVisited'
  | 'isExplored'
  | 'isScouted'
  | 'renderedLandmark'
> & {
  hasHiddenSites: boolean;
  terrain: ExtendedHexData['terrain'] | 'Unknown';
  biome: ExtendedHexData['biome'] | 'Unknown';
  /**
   * Roleplay books reminded at this hex's features, resolved to title + slug.
   * GM-only: attached solely in the GM branch below, so player payloads never
   * carry it. The detail panel renders it behind its own GM gate as well.
   */
  roleplayBooks?: RoleplayBookMapEntry[];
  /**
   * Whether the hex is tagged as an impassable Lost Valley barrier. A derived
   * boolean rather than the raw `tags` array — other hex tags (e.g.
   * `scar-site`, `fc-ruins`) are spoilers, so player payloads never carry
   * `tags` itself. Only set once the hex is visited or scouted; undiscovered
   * hexes stay fully redacted.
   */
  isImpassable?: boolean;
};

/**
 * Collect the roleplay books anchored on a hex's landmark + hidden sites and
 * resolve each slug to its display title, sorted for stable rendering. Slugs
 * with no matching book are dropped (the build-time reference check guarantees
 * none dangle in committed data).
 */
function collectHexRoleplayBooks(
  hex: ExtendedHexData,
  bookNameBySlug: Map<string, string>,
): RoleplayBookMapEntry[] {
  const slugs = new Set<string>();
  const pull = (feature: unknown): void => {
    if (!feature || typeof feature !== 'object') return;
    const books = (feature as { roleplayBooks?: unknown }).roleplayBooks;
    if (!Array.isArray(books)) return;
    for (const slug of books) {
      if (typeof slug === 'string') slugs.add(slug);
    }
  };
  pull(hex.landmark);
  if (Array.isArray(hex.hiddenSites)) {
    hex.hiddenSites.forEach(pull);
  }
  return [...slugs]
    .map((id) => ({ id, name: bookNameBySlug.get(id) }))
    .filter((b): b is RoleplayBookMapEntry => b.name !== undefined)
    .sort((a, b) => sortIgnoringArticles(a.name, b.name));
}

export const GET: APIRoute = async ({ locals }) => {
  const [hexEntries, regionEntries, roleplayBookEntries] = await Promise.all([
    getCollection('hexes'),
    getCollection('regions'),
    getCollection('roleplay-books'),
  ]);

  // Slug → display title, for resolving a hex's anchored roleplay books (GM only).
  const bookNameBySlug = new Map(
    roleplayBookEntries.map((b) => [b.id, b.data.name]),
  );

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
  const allHexData = [...hexEntries.map((e) => e.data), ...syntheticHexes];

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

      const isImpassable =
        data.tags?.includes(LOST_VALLEY_BARRIER_TAG) ?? false;

      if (role === SECURITY_ROLE.GM) {
        // GM gets full data - type assertion needed as we return superset of HexPlayerData
        return {
          ...data,
          hasHiddenSites,
          roleplayBooks: collectHexRoleplayBooks(data, bookNameBySlug),
          isImpassable,
        } as HexPlayerData;
      }

      // Redact fields for players
      if (hex.isVisited) {
        return {
          id: data.id,
          name: data.name,
          landmark: data.landmark,
          regionId: data.regionId,
          regionName: data.regionName,
          terrain: data.terrain,
          biome: data.biome,
          topography: data.topography,
          isVisited: data.isVisited,
          isExplored: data.isExplored,
          renderedLandmark: data.renderedLandmark,
          hasHiddenSites,
          isImpassable,
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
          regionName: data.regionName,
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
          isImpassable,
        };
      }

      return {
        id: data.id,
        name: UNKNOWN_CONTENT,
        landmark: UNKNOWN_CONTENT,
        regionId: data.regionId,
        regionName: data.regionName,
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

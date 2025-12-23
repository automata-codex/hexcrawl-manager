import { normalizeHexId } from '@achm/core';

import type { CoordinateNotation } from '@achm/core';
import type { HexEntry, RegionEntry } from '../types.ts';

/**
 * Get all unique hex IDs referenced by any region.
 */
export function getAllRegionHexIds(
  regions: RegionEntry[],
  notation: CoordinateNotation,
): Set<string> {
  const hexIds = new Set<string>();
  for (const region of regions) {
    for (const hexId of region.data.hexes ?? []) {
      hexIds.add(normalizeHexId(hexId, notation));
    }
  }
  return hexIds;
}

/**
 * Create a map of region IDs to their associated hex IDs.
 * Uses the region's `hexes` array (the authoritative source of region membership).
 */
export function getHexesByRegion(
  regions: RegionEntry[],
): Record<string, string[]> {
  return regions.reduce(
    (map, region) => {
      // Use region.data.hexes as the source of truth
      map[region.id] = region.data.hexes ?? [];
      return map;
    },
    {} as Record<string, string[]>,
  );
}

/**
 * Build a lookup map from hex ID to region entry.
 */
export function buildHexToRegionLookup(
  regions: RegionEntry[],
  notation: CoordinateNotation,
): Map<string, RegionEntry> {
  const lookup = new Map<string, RegionEntry>();
  for (const region of regions) {
    const hexIds = region.data.hexes ?? [];
    for (const hexId of hexIds) {
      lookup.set(normalizeHexId(hexId, notation), region);
    }
  }
  return lookup;
}

/**
 * Fetch full hex entries for a specific region.
 * Uses the region's hexes array to find matching hex entries.
 */
export function getHexEntriesForRegion(
  regions: RegionEntry[],
  hexes: HexEntry[],
  regionId: string,
): (HexEntry | undefined)[] {
  const region = regions.find((r) => r.id === regionId);
  if (!region) {
    return [];
  }

  const hexIds = region.data.hexes ?? [];
  const hexMap = new Map(hexes.map((hex) => [hex.id.toLowerCase(), hex]));

  return hexIds.map((hexId) => hexMap.get(hexId.toLowerCase()));
}

export function getRegionNumber(regionId: string): number {
  const regionNumber = regionId.split('-')[1];
  return parseInt(regionNumber, 10);
}

export function getRegionTitle(regionId: string): string {
  const regionNumber = getRegionNumber(regionId);
  return `Region ${regionNumber}`;
}

export function regionSort(a: string, b: string): number {
  const aRegionNumber = getRegionNumber(a);
  const bRegionNumber = getRegionNumber(b);
  return aRegionNumber - bRegionNumber;
}

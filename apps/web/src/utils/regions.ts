import { normalizeHexId, sortIgnoringArticles } from '@achm/core';

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

const NUMBERED_REGION_PATTERN = /^region-(\d+)$/;

/**
 * Extract the region number from a numbered region ID (e.g., "region-1" -> 1).
 * Returns null for non-numbered region IDs.
 */
export function getRegionNumber(regionId: string): number | null {
  const match = regionId.match(NUMBERED_REGION_PATTERN);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Get a short display title for a region.
 * - For numbered regions (region-1), returns "Region 1"
 * - For other regions, returns just the name (or ID as fallback)
 */
export function getRegionShortTitle(regionId: string, regionName?: string): string {
  const num = getRegionNumber(regionId);
  if (num !== null) {
    return `Region ${num}`;
  }
  return regionName ?? regionId;
}

/**
 * Get a full display title for a region including the name.
 * - For numbered regions (region-1), returns "Region 1: Name"
 * - For other regions, returns "Region: Name"
 */
export function getRegionFullTitle(regionId: string, regionName: string): string {
  const num = getRegionNumber(regionId);
  if (num !== null) {
    return `Region ${num}: ${regionName}`;
  }
  return `Region: ${regionName}`;
}

/**
 * Sort region IDs with numbered regions first (numerically),
 * then non-numbered regions alphabetically.
 */
export function regionSort(a: string, b: string): number {
  const aNum = getRegionNumber(a);
  const bNum = getRegionNumber(b);

  // Both numbered: sort numerically
  if (aNum !== null && bNum !== null) {
    return aNum - bNum;
  }
  // Only a is numbered: a comes first
  if (aNum !== null) {
    return -1;
  }
  // Only b is numbered: b comes first
  if (bNum !== null) {
    return 1;
  }
  // Neither numbered: sort alphabetically, ignoring articles
  return sortIgnoringArticles(a, b);
}

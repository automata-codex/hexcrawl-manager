import type { HexEntry, RegionEntry } from '../types.ts';

// Create a map of region IDs to their associated hex IDs
export async function getHexesByRegion(
  regions: RegionEntry[],
  hexes: HexEntry[],
) {
  // Create a map of region IDs to their associated hex IDs
  return regions.reduce(
    (map, region) => {
      map[region.id] = hexes
        .filter((hex) => hex.data.regionId === region.id)
        .map((hex) => hex.id);
      return map;
    },
    {} as Record<string, string[]>,
  );
}

// Fetch full hex entries for a specific region
export async function getHexEntriesForRegion(
  regions: RegionEntry[],
  hexes: HexEntry[],
  regionId: string,
) {
  const hexesByRegion = await getHexesByRegion(regions, hexes);

  const hexIds = hexesByRegion[regionId] || [];
  return Promise.all(
    hexIds.map((hexId) => hexes.find((hex) => hex.id === hexId)),
  );
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

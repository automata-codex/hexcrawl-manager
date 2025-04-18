import { getCollection, getEntry } from 'astro:content';
import { getRegionNumber } from './id-parsers.ts';

// Create a map of region IDs to their associated hex IDs
export async function getHexesByRegion() {
  const hexes = await getCollection('hexes');
  const regions = await getCollection('regions');

  // Create a map of region IDs to their associated hex IDs
  return regions.reduce((map, region) => {
    map[region.id] = hexes
      .filter(hex => hex.data.regionId === region.id)
      .map(hex => hex.id);
    return map;
  }, {} as Record<string, string[]>);
}

// Fetch full hex entries for a specific region
export async function getHexEntriesForRegion(regionId: string) {
  const hexesByRegion = await getHexesByRegion();

  const hexIds = hexesByRegion[regionId] || [];
  return Promise.all(
    hexIds.map(hexId => getEntry('hexes', hexId))
  );
}

export function regionSort(a: string, b: string): number {
  const aRegionNumber = getRegionNumber(a);
  const bRegionNumber = getRegionNumber(b);
  return aRegionNumber - bRegionNumber;
}

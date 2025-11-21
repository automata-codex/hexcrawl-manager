import type {
  DungeonData,
  EncounterTableData,
  HexData,
  RegionData,
  UsageReference,
} from '@skyreach/schemas';

/**
 * A reference to where an encounter is used.
 */
export type { UsageReference };

/**
 * Map of encounter IDs to their usage locations.
 */
export type EncounterUsageMap = Map<string, UsageReference[]>;

/**
 * Extracts encounter IDs from a region's encounter tables.
 */
function extractEncounterIdsFromRegion(regionData: RegionData): string[] {
  const encounterIds = new Set<string>();

  // Extract from encounter tables
  const encounters = regionData.encounters as EncounterTableData | undefined;
  if (encounters?.categoryTables) {
    for (const categoryTable of Object.values(encounters.categoryTables)) {
      for (const tierEntries of Object.values(categoryTable)) {
        for (const entry of tierEntries) {
          if (entry.encounterId) {
            encounterIds.add(entry.encounterId);
          }
        }
      }
    }
  }

  // Also include explicit encounterIds if present
  if (regionData.encounterIds) {
    for (const id of regionData.encounterIds) {
      encounterIds.add(id);
    }
  }

  return Array.from(encounterIds);
}

/**
 * Builds a map of encounter IDs to their usage locations by scanning
 * dungeons, hexes, and regions.
 *
 * @param dungeons - Array of dungeon entries from the collection
 * @param hexes - Array of hex entries from the collection
 * @param regions - Array of region entries from the collection
 * @returns Map of encounter IDs to arrays of usage references
 */
export function buildEncounterUsageMap(
  dungeons: Array<{ id: string; data: DungeonData }>,
  hexes: Array<{ id: string; data: HexData }>,
  regions: Array<{ id: string; data: RegionData }>,
): EncounterUsageMap {
  const usageMap: EncounterUsageMap = new Map();

  function addUsage(encounterId: string, reference: UsageReference): void {
    if (!usageMap.has(encounterId)) {
      usageMap.set(encounterId, []);
    }
    usageMap.get(encounterId)!.push(reference);
  }

  // Scan dungeons
  for (const dungeon of dungeons) {
    const encounterIds = dungeon.data.encounters || [];
    for (const encounterId of encounterIds) {
      addUsage(encounterId, {
        type: 'dungeon',
        id: dungeon.data.id,
        name: dungeon.data.name,
      });
    }
  }

  // Scan hexes
  for (const hex of hexes) {
    const encounterIds = hex.data.encounters || [];
    for (const encounterId of encounterIds) {
      addUsage(encounterId, {
        type: 'hex',
        id: hex.data.id,
        name: hex.data.name,
      });
    }
  }

  // Scan regions
  for (const region of regions) {
    const encounterIds = extractEncounterIdsFromRegion(region.data);
    for (const encounterId of encounterIds) {
      addUsage(encounterId, {
        type: 'region',
        id: region.data.id,
        name: region.data.name,
      });
    }
  }

  return usageMap;
}

/**
 * Gets usage references for a specific encounter.
 *
 * @param usageMap - The pre-built usage map
 * @param encounterId - The encounter ID to look up
 * @returns Array of usage references, or empty array if not used anywhere
 */
export function getEncounterUsage(
  usageMap: EncounterUsageMap,
  encounterId: string,
): UsageReference[] {
  return usageMap.get(encounterId) || [];
}

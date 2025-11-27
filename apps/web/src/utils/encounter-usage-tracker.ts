import type {
  DungeonData,
  EncounterTableData,
  HexData,
  PointcrawlData,
  PointcrawlEdgeData,
  PointcrawlNodeData,
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
 * Extracts encounter IDs from category tables (used by both regions and hex overrides).
 */
function extractEncounterIdsFromCategoryTables(
  categoryTables: Record<string, Record<string, Array<{ encounterId: string }>>>,
): string[] {
  const encounterIds = new Set<string>();

  for (const categoryTable of Object.values(categoryTables)) {
    for (const tierEntries of Object.values(categoryTable)) {
      for (const entry of tierEntries) {
        if (entry.encounterId) {
          encounterIds.add(entry.encounterId);
        }
      }
    }
  }

  return Array.from(encounterIds);
}

/**
 * Extracts encounter IDs from a region's encounter tables.
 */
function extractEncounterIdsFromRegion(regionData: RegionData): string[] {
  const encounterIds = new Set<string>();

  // Extract from encounter tables
  const encounters = regionData.encounters as EncounterTableData | undefined;
  if (encounters?.categoryTables) {
    for (const id of extractEncounterIdsFromCategoryTables(encounters.categoryTables)) {
      encounterIds.add(id);
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
 * Extracts encounter IDs from a hex's encounter overrides and explicit encounters array.
 */
function extractEncounterIdsFromHex(hexData: HexData): string[] {
  const encounterIds = new Set<string>();

  // Extract from explicit encounters array (new field)
  if (hexData.encounters) {
    for (const id of hexData.encounters) {
      encounterIds.add(id);
    }
  }

  // Extract from encounter overrides (existing field)
  const overrides = hexData.encounterOverrides;
  if (overrides && 'categoryTables' in overrides && overrides.categoryTables) {
    for (const id of extractEncounterIdsFromCategoryTables(
      overrides.categoryTables as Record<string, Record<string, Array<{ encounterId: string }>>>,
    )) {
      encounterIds.add(id);
    }
  }

  return Array.from(encounterIds);
}

/**
 * Extracts encounter IDs from a pointcrawl's encounter tables.
 */
function extractEncounterIdsFromPointcrawl(pointcrawlData: PointcrawlData): string[] {
  const encounterIds = new Set<string>();

  const encounters = pointcrawlData.encounters as EncounterTableData | undefined;
  if (encounters?.categoryTables) {
    for (const id of extractEncounterIdsFromCategoryTables(encounters.categoryTables)) {
      encounterIds.add(id);
    }
  }

  return Array.from(encounterIds);
}

/**
 * Extracts encounter IDs from a pointcrawl node's set encounters and encounter overrides.
 */
function extractEncounterIdsFromPointcrawlNode(nodeData: PointcrawlNodeData): string[] {
  const encounterIds = new Set<string>();

  // Extract from set encounters
  if (nodeData.encounters) {
    for (const id of nodeData.encounters) {
      encounterIds.add(id);
    }
  }

  // Extract from encounter overrides
  const overrides = nodeData.encounterOverrides;
  if (overrides && 'categoryTables' in overrides && overrides.categoryTables) {
    for (const id of extractEncounterIdsFromCategoryTables(
      overrides.categoryTables as Record<string, Record<string, Array<{ encounterId: string }>>>,
    )) {
      encounterIds.add(id);
    }
  }

  return Array.from(encounterIds);
}

/**
 * Extracts encounter IDs from a pointcrawl edge's set encounters and encounter overrides.
 */
function extractEncounterIdsFromPointcrawlEdge(edgeData: PointcrawlEdgeData): string[] {
  const encounterIds = new Set<string>();

  // Extract from set encounters
  if (edgeData.encounters) {
    for (const id of edgeData.encounters) {
      encounterIds.add(id);
    }
  }

  // Extract from encounter overrides
  const overrides = edgeData.encounterOverrides;
  if (overrides && 'categoryTables' in overrides && overrides.categoryTables) {
    for (const id of extractEncounterIdsFromCategoryTables(
      overrides.categoryTables as Record<string, Record<string, Array<{ encounterId: string }>>>,
    )) {
      encounterIds.add(id);
    }
  }

  return Array.from(encounterIds);
}

/**
 * Builds a map of encounter IDs to their usage locations by scanning
 * dungeons, hexes, regions, pointcrawls, and pointcrawl nodes/edges.
 *
 * @param dungeons - Array of dungeon entries from the collection
 * @param hexes - Array of hex entries from the collection
 * @param regions - Array of region entries from the collection
 * @param pointcrawls - Array of pointcrawl entries from the collection
 * @param pointcrawlNodes - Array of pointcrawl node entries from the collection
 * @param pointcrawlEdges - Array of pointcrawl edge entries from the collection
 * @returns Map of encounter IDs to arrays of usage references
 */
export function buildEncounterUsageMap(
  dungeons: Array<{ id: string; data: DungeonData }>,
  hexes: Array<{ id: string; data: HexData }>,
  regions: Array<{ id: string; data: RegionData }>,
  pointcrawls: Array<{ id: string; data: PointcrawlData }>,
  pointcrawlNodes: Array<{ id: string; data: PointcrawlNodeData }>,
  pointcrawlEdges: Array<{ id: string; data: PointcrawlEdgeData }>,
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

  // Scan hexes (both explicit encounters array and encounter overrides)
  for (const hex of hexes) {
    const encounterIds = extractEncounterIdsFromHex(hex.data);
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

  // Build a lookup map for pointcrawl names (needed for edge labels)
  const pointcrawlNameMap = new Map<string, string>();
  for (const pointcrawl of pointcrawls) {
    pointcrawlNameMap.set(pointcrawl.data.id, pointcrawl.data.name);
  }

  // Scan pointcrawls (encounter tables)
  for (const pointcrawl of pointcrawls) {
    const encounterIds = extractEncounterIdsFromPointcrawl(pointcrawl.data);
    for (const encounterId of encounterIds) {
      addUsage(encounterId, {
        type: 'pointcrawl',
        id: pointcrawl.data.id,
        name: pointcrawl.data.name,
      });
    }
  }

  // Scan pointcrawl nodes
  for (const node of pointcrawlNodes) {
    const encounterIds = extractEncounterIdsFromPointcrawlNode(node.data);
    for (const encounterId of encounterIds) {
      addUsage(encounterId, {
        type: 'pointcrawl-node',
        id: node.data.id,
        name: node.data.name,
      });
    }
  }

  // Scan pointcrawl edges
  for (const edge of pointcrawlEdges) {
    const encounterIds = extractEncounterIdsFromPointcrawlEdge(edge.data);
    const pointcrawlName = pointcrawlNameMap.get(edge.data.pointcrawlId) || edge.data.pointcrawlId;
    for (const encounterId of encounterIds) {
      addUsage(encounterId, {
        type: 'pointcrawl-edge',
        id: edge.data.id,
        name: `${pointcrawlName} - Edge ${edge.data.label}`,
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

import type {
  DungeonData,
  EncounterCategoryTableData,
  EncounterTableData,
  HexData,
  PointcrawlData,
  PointcrawlEdgeData,
  PointcrawlNodeData,
  RegionData,
  UsageReference,
} from '@achm/schemas';

/**
 * A reference to where an encounter is used.
 */
export type { UsageReference };

/**
 * Map of encounter IDs to their usage locations.
 */
export type EncounterUsageMap = Map<string, UsageReference[]>;

/**
 * Map of external table IDs to the encounter IDs they contain.
 */
export type ExternalTableMap = Map<string, string[]>;

/**
 * Builds a map from external table IDs to the encounter IDs they contain.
 * Only processes encounter-reference tables (not description tables).
 */
function buildExternalTableMap(
  categoryTables: Array<{ id: string; data: EncounterCategoryTableData }>,
): ExternalTableMap {
  const tableMap: ExternalTableMap = new Map();

  for (const table of categoryTables) {
    if (table.data.type === 'encounter-reference') {
      const encounterIds: string[] = [];
      for (const tierEntries of Object.values(table.data.tiers)) {
        for (const entry of tierEntries) {
          if (!encounterIds.includes(entry.encounterId)) {
            encounterIds.push(entry.encounterId);
          }
        }
      }
      tableMap.set(table.id, encounterIds);
    }
  }

  return tableMap;
}

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

  // Include herald encounters
  if (regionData.heraldEncounters) {
    for (const id of regionData.heraldEncounters) {
      encounterIds.add(id);
    }
  }

  return Array.from(encounterIds);
}

/**
 * Extracts encounter IDs from a hex's encounter overrides, explicit encounters array,
 * hidden sites with encounter links, and external table references.
 */
function extractEncounterIdsFromHex(
  hexData: HexData,
  externalTableMap: ExternalTableMap,
): string[] {
  const encounterIds = new Set<string>();

  // Extract from explicit encounters array (new field)
  if (hexData.encounters) {
    for (const id of hexData.encounters) {
      encounterIds.add(id);
    }
  }

  // Extract from encounter overrides (existing field)
  const overrides = hexData.encounterOverrides;
  if (overrides) {
    // Extract from inline categoryTables
    if ('categoryTables' in overrides && overrides.categoryTables) {
      for (const id of extractEncounterIdsFromCategoryTables(
        overrides.categoryTables as Record<
          string,
          Record<string, Array<{ encounterId: string }>>
        >,
      )) {
        encounterIds.add(id);
      }
    }

    // Extract from external table references in mainTable
    if ('mainTable' in overrides && overrides.mainTable) {
      for (const entry of overrides.mainTable) {
        if (entry.tableId) {
          const tableEncounterIds = externalTableMap.get(entry.tableId);
          if (tableEncounterIds) {
            for (const id of tableEncounterIds) {
              encounterIds.add(id);
            }
          }
        }
      }
    }
  }

  // Extract from hidden sites with encounter links
  if (hexData.hiddenSites && Array.isArray(hexData.hiddenSites)) {
    for (const site of hexData.hiddenSites) {
      // Skip legacy string format (just descriptions)
      if (typeof site === 'string') continue;

      // Check for encounter links in object format
      if (site.linkType === 'encounter' && site.linkId) {
        encounterIds.add(site.linkId);
      }
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
 * @param encounterCategoryTables - Array of external encounter category tables
 * @returns Map of encounter IDs to arrays of usage references
 */
export function buildEncounterUsageMap(
  dungeons: Array<{ id: string; data: DungeonData }>,
  hexes: Array<{ id: string; data: HexData }>,
  regions: Array<{ id: string; data: RegionData }>,
  pointcrawls: Array<{ id: string; data: PointcrawlData }>,
  pointcrawlNodes: Array<{ id: string; data: PointcrawlNodeData }>,
  pointcrawlEdges: Array<{ id: string; data: PointcrawlEdgeData }>,
  encounterCategoryTables: Array<{
    id: string;
    data: EncounterCategoryTableData;
  }> = [],
): EncounterUsageMap {
  const usageMap: EncounterUsageMap = new Map();

  // Build external table map for resolving tableId references
  const externalTableMap = buildExternalTableMap(encounterCategoryTables);

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

  // Scan hexes (explicit encounters, encounter overrides, and external table refs)
  for (const hex of hexes) {
    const encounterIds = extractEncounterIdsFromHex(hex.data, externalTableMap);
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

  // Build lookup maps for pointcrawl names and slugs (needed for nodes/edges)
  const pointcrawlNameMap = new Map<string, string>();
  const pointcrawlSlugMap = new Map<string, string>();
  for (const pointcrawl of pointcrawls) {
    pointcrawlNameMap.set(pointcrawl.data.id, pointcrawl.data.name);
    pointcrawlSlugMap.set(pointcrawl.data.id, pointcrawl.data.slug);
  }

  // Scan pointcrawls (encounter tables)
  // Store slug for routing (getPointcrawlPath expects slug, not id)
  for (const pointcrawl of pointcrawls) {
    const encounterIds = extractEncounterIdsFromPointcrawl(pointcrawl.data);
    for (const encounterId of encounterIds) {
      addUsage(encounterId, {
        type: 'pointcrawl',
        id: pointcrawl.data.slug,
        name: pointcrawl.data.name,
      });
    }
  }

  // Scan pointcrawl nodes
  // Store compound id as "pointcrawlSlug/nodeId" for routing to node detail page
  for (const node of pointcrawlNodes) {
    const encounterIds = extractEncounterIdsFromPointcrawlNode(node.data);
    const pointcrawlSlug = pointcrawlSlugMap.get(node.data.pointcrawlId) || node.data.pointcrawlId;
    for (const encounterId of encounterIds) {
      addUsage(encounterId, {
        type: 'pointcrawl-node',
        id: `${pointcrawlSlug}/${node.data.id}`,
        name: node.data.name,
      });
    }
  }

  // Scan pointcrawl edges
  // Store compound id as "pointcrawlSlug/edgeId" for routing to edge detail page
  for (const edge of pointcrawlEdges) {
    const encounterIds = extractEncounterIdsFromPointcrawlEdge(edge.data);
    const pointcrawlName = pointcrawlNameMap.get(edge.data.pointcrawlId) || edge.data.pointcrawlId;
    const pointcrawlSlug = pointcrawlSlugMap.get(edge.data.pointcrawlId) || edge.data.pointcrawlId;
    for (const encounterId of encounterIds) {
      addUsage(encounterId, {
        type: 'pointcrawl-edge',
        id: `${pointcrawlSlug}/${edge.data.id}`,
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

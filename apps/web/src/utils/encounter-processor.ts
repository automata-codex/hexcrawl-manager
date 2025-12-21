import type {
  CreatureType,
  EncounterData,
  HexData,
  HiddenSite,
  LinkType,
  RoleplayBookData,
  StatBlockData,
} from '@achm/schemas';

/**
 * Derives creature types for an encounter based on its stat blocks.
 *
 * @param encounter - The encounter data
 * @param statBlockMap - Map of stat block IDs to their data
 * @returns Array of unique creature types found in the encounter's stat blocks
 */
export function deriveCreatureTypes(
  encounter: EncounterData,
  statBlockMap: Map<string, StatBlockData>,
): CreatureType[] {
  const creatureTypes = new Set<CreatureType>();

  for (const statBlockId of encounter.statBlocks || []) {
    const statBlock = statBlockMap.get(statBlockId);
    if (statBlock?.type) {
      creatureTypes.add(statBlock.type);
    }
  }

  return Array.from(creatureTypes).sort();
}

/**
 * Builds a map of stat block IDs to stat block data for efficient lookup.
 *
 * @param statBlocks - Array of stat block entries from the collection
 * @returns Map of stat block IDs to their data
 */
export function buildStatBlockMap(
  statBlocks: Array<{ id: string; data: StatBlockData }>,
): Map<string, StatBlockData> {
  return new Map(statBlocks.map((sb) => [sb.id, sb.data]));
}

/**
 * Detects which encounters are "leads" by scanning roleplay book intelligence reports.
 *
 * An encounter is a "lead" if it's referenced in any roleplay book's intelligence report
 * via linkType='encounter' and linkId fields.
 *
 * @param roleplayBooks - Array of roleplay book entries from the collection
 * @returns Set of encounter IDs that are leads
 */
export function detectLeadEncounters(
  roleplayBooks: Array<{ id: string; data: RoleplayBookData }>,
): Set<string> {
  const leadEncounterIds = new Set<string>();

  for (const book of roleplayBooks) {
    const reports = book.data.intelligenceReports?.rows || [];

    for (const report of reports) {
      // Check if this report links to an encounter
      if (report.linkType === 'encounter' && report.linkId) {
        leadEncounterIds.add(report.linkId);
      }
    }
  }

  return leadEncounterIds;
}

/**
 * Type guard to check if a hidden site has link fields.
 */
function isHiddenSiteWithLink(
  site: string | HiddenSite,
): site is HiddenSite & { linkType: LinkType; linkId: string } {
  return (
    typeof site === 'object' &&
    'linkType' in site &&
    'linkId' in site &&
    !!site.linkType &&
    !!site.linkId
  );
}

export interface HiddenSiteBacklink {
  hexId: string;
  hexName: string;
}

/**
 * Finds hexes that have hidden sites linking to a specific target.
 *
 * @param hexes - Array of hex entries from the collection
 * @param targetLinkType - The link type to search for (e.g., 'encounter', 'dungeon')
 * @param targetLinkId - The link ID to search for (e.g., 'missing-patrol')
 * @returns Array of hex references that have hidden sites linking to the target
 */
export function findHexesWithHiddenSiteLink(
  hexes: Array<{ id: string; data: HexData }>,
  targetLinkType: LinkType,
  targetLinkId: string,
): HiddenSiteBacklink[] {
  const results: HiddenSiteBacklink[] = [];

  for (const hex of hexes) {
    const hiddenSites = hex.data.hiddenSites;
    if (!hiddenSites || !Array.isArray(hiddenSites)) continue;

    for (const site of hiddenSites) {
      if (
        isHiddenSiteWithLink(site) &&
        site.linkType === targetLinkType &&
        site.linkId === targetLinkId
      ) {
        results.push({
          hexId: hex.id,
          hexName: hex.data.name,
        });
        // Only add each hex once, even if it has multiple matching hidden sites
        break;
      }
    }
  }

  return results;
}

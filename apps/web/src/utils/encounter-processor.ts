import type { CreatureType, EncounterData, StatBlockData } from '@skyreach/schemas';

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

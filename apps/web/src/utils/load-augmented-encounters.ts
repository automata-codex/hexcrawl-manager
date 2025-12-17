import type {
  CreatureType,
  EncounterData,
  UsageReference,
} from '@skyreach/schemas';
import { getCollection } from 'astro:content';

import {
  buildStatBlockMap,
  deriveCreatureTypes,
  detectLeadEncounters,
} from './encounter-processor';
import {
  buildEncounterUsageMap,
  type EncounterUsageMap,
} from './encounter-usage-tracker';

/**
 * Encounter data augmented with derived fields.
 */
export interface AugmentedEncounter {
  id: string;
  data: EncounterData & {
    creatureTypes: CreatureType[];
    usedIn: UsageReference[];
    isLead: boolean;
  };
}

/**
 * Result of loading augmented encounters.
 */
export interface AugmentedEncountersResult {
  encounters: AugmentedEncounter[];
  usageMap: EncounterUsageMap;
}

/**
 * Loads all encounters with derived fields populated:
 * - creatureTypes: derived from stat blocks
 * - usedIn: derived from dungeons, hexes, and regions
 * - isLead: derived from roleplay book intelligence reports
 *
 * This function fetches all necessary collections and computes derived data.
 * Use this in pages that need the full augmented encounter data.
 */
export async function loadAugmentedEncounters(): Promise<AugmentedEncountersResult> {
  // Load all necessary collections in parallel
  const [
    encounters,
    statBlocks,
    dungeons,
    hexes,
    regions,
    roleplayBooks,
    pointcrawls,
    pointcrawlNodes,
    pointcrawlEdges,
    encounterCategoryTables,
  ] = await Promise.all([
    getCollection('encounters'),
    getCollection('statBlocks'),
    getCollection('dungeons'),
    getCollection('hexes'),
    getCollection('regions'),
    getCollection('roleplay-books'),
    getCollection('pointcrawls'),
    getCollection('pointcrawl-nodes'),
    getCollection('pointcrawl-edges'),
    getCollection('encounter-category-tables'),
  ]);

  // Build lookup maps
  const statBlockMap = buildStatBlockMap(statBlocks);
  const usageMap = buildEncounterUsageMap(
    dungeons,
    hexes,
    regions,
    pointcrawls,
    pointcrawlNodes,
    pointcrawlEdges,
    encounterCategoryTables,
  );
  const leadEncounterIds = detectLeadEncounters(roleplayBooks);

  // Augment each encounter with derived fields
  const augmentedEncounters: AugmentedEncounter[] = encounters.map(
    (encounter) => ({
      id: encounter.id,
      data: {
        ...encounter.data,
        creatureTypes: deriveCreatureTypes(encounter.data, statBlockMap),
        usedIn: usageMap.get(encounter.id) || [],
        isLead: leadEncounterIds.has(encounter.id),
      },
    }),
  );

  return {
    encounters: augmentedEncounters,
    usageMap,
  };
}

/**
 * Loads a single encounter with derived fields populated.
 *
 * @param encounterId - The ID of the encounter to load
 * @returns The augmented encounter, or null if not found
 */
export async function loadAugmentedEncounter(
  encounterId: string,
): Promise<AugmentedEncounter | null> {
  const { encounters } = await loadAugmentedEncounters();
  return encounters.find((e) => e.id === encounterId) || null;
}

/**
 * Extracts unique values for filter options from augmented encounters.
 */
export function extractFilterOptions(encounters: AugmentedEncounter[]): {
  scopes: string[];
  locationTypes: string[];
  factions: string[];
  creatureTypes: string[];
} {
  const scopes = new Set<string>();
  const locationTypes = new Set<string>();
  const factions = new Set<string>();
  const creatureTypes = new Set<string>();

  for (const encounter of encounters) {
    if (encounter.data.scope) {
      scopes.add(encounter.data.scope);
    }
    for (const lt of encounter.data.locationTypes || []) {
      locationTypes.add(lt);
    }
    for (const f of encounter.data.factions || []) {
      factions.add(f);
    }
    for (const ct of encounter.data.creatureTypes) {
      creatureTypes.add(ct);
    }
  }

  return {
    scopes: Array.from(scopes).sort(),
    locationTypes: Array.from(locationTypes).sort(),
    factions: Array.from(factions).sort(),
    creatureTypes: Array.from(creatureTypes).sort(),
  };
}

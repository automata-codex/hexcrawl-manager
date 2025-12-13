import type {
  CharacterData,
  ClueReference,
  DungeonData,
  EncounterData,
  GmNote,
  HexData,
  HiddenSite,
  NpcData,
  PlotlineData,
  PointcrawlNodeData,
} from '@skyreach/schemas';
import { normalizeClueRef } from '@skyreach/schemas';

/**
 * A reference to where a clue can be discovered.
 */
export interface ClueUsageReference {
  type:
    | 'encounter'
    | 'hex-landmark'
    | 'hex-hidden-site'
    | 'hex-dream'
    | 'hex-keyed-encounter'
    | 'dungeon'
    | 'pointcrawl-node'
    | 'character'
    | 'npc'
    | 'plotline';
  id: string;
  name: string;
  hexId?: string; // For landmark/hidden-site/dream, which hex contains it
}

/**
 * Extracts clue IDs from a clue references array (handles both string and object formats).
 */
function extractClueIds(refs: ClueReference[] | undefined): string[] {
  if (!refs) return [];
  return refs.map((ref) => normalizeClueRef(ref).id);
}

/**
 * Map of clue IDs to their usage locations.
 */
export type ClueUsageMap = Map<string, ClueUsageReference[]>;

/**
 * Extracts clue IDs from a hex's landmark (if it's an object with clues).
 */
function extractClueIdsFromLandmark(
  hexData: HexData,
): { clueIds: string[]; landmarkName: string } {
  const result = { clueIds: [] as string[], landmarkName: '' };

  if (typeof hexData.landmark === 'object' && hexData.landmark.clues) {
    result.clueIds = extractClueIds(hexData.landmark.clues);
    result.landmarkName = hexData.landmark.description;
  }

  return result;
}

/**
 * Extracts clue IDs from a hex's hidden sites.
 * This includes both:
 * - clues array: clues that can be discovered at this site
 * - clueId field: the clue that revealed/led to this site (for source: 'clue' sites)
 */
function extractClueIdsFromHiddenSites(
  hexData: HexData,
): Array<{ clueId: string }> {
  const results: Array<{ clueId: string }> = [];

  if (!hexData.hiddenSites || !Array.isArray(hexData.hiddenSites)) {
    return results;
  }

  for (const site of hexData.hiddenSites) {
    // Skip legacy string format
    if (typeof site === 'string') continue;

    const hiddenSite = site as HiddenSite;

    // Check for clues array (clues discoverable at this site)
    if (hiddenSite.clues) {
      for (const clueId of extractClueIds(hiddenSite.clues)) {
        results.push({ clueId });
      }
    }

    // Check for clueId field (clue that revealed this site, for source: 'clue' sites)
    if ('clueId' in hiddenSite && typeof hiddenSite.clueId === 'string') {
      results.push({ clueId: hiddenSite.clueId });
    }
  }

  return results;
}

/**
 * Extracts clue IDs from a hex's GM notes (dream-clues).
 */
function extractClueIdsFromNotes(
  hexData: HexData,
): Array<{ clueId: string; noteDescription: string }> {
  const results: Array<{ clueId: string; noteDescription: string }> = [];

  if (!hexData.notes || !Array.isArray(hexData.notes)) {
    return results;
  }

  for (const note of hexData.notes) {
    // Check if it's a structured note with a clueId
    if (typeof note === 'object') {
      const gmNote = note as GmNote;
      if (typeof gmNote === 'object' && 'clueId' in gmNote && gmNote.clueId) {
        results.push({
          clueId: gmNote.clueId,
          noteDescription: gmNote.description,
        });
      }
    }
  }

  return results;
}

/**
 * Builds a map of clue IDs to their usage locations by scanning
 * encounters, hexes (landmarks, hidden sites, notes, keyed encounters),
 * dungeons, pointcrawl nodes, characters, NPCs, and plotlines.
 */
export function buildClueUsageMap(
  encounters: Array<{ id: string; data: EncounterData }>,
  hexes: Array<{ id: string; data: HexData }>,
  dungeons: Array<{ id: string; data: DungeonData }>,
  pointcrawlNodes: Array<{ id: string; data: PointcrawlNodeData }>,
  // We also need encounters map to resolve keyed encounter names
  encounterMap: Map<string, EncounterData>,
  // New sources for clue placement
  characters: Array<{ id: string; data: CharacterData }> = [],
  npcs: Array<{ id: string; data: NpcData }> = [],
  plotlines: Array<{ id: string; data: PlotlineData }> = [],
): ClueUsageMap {
  const usageMap: ClueUsageMap = new Map();

  function addUsage(clueId: string, reference: ClueUsageReference): void {
    if (!usageMap.has(clueId)) {
      usageMap.set(clueId, []);
    }
    usageMap.get(clueId)!.push(reference);
  }

  // Scan encounters for direct clue references
  for (const encounter of encounters) {
    if (encounter.data.clues) {
      for (const clueId of extractClueIds(encounter.data.clues)) {
        addUsage(clueId, {
          type: 'encounter',
          id: encounter.data.id,
          name: `${encounter.data.name} (Encounter)`,
        });
      }
    }
  }

  // Scan hexes
  for (const hex of hexes) {
    // Check landmark clues
    const { clueIds: landmarkClueIds } = extractClueIdsFromLandmark(hex.data);
    for (const clueId of landmarkClueIds) {
      addUsage(clueId, {
        type: 'hex-landmark',
        id: hex.data.id,
        name: `${hex.data.name} (Hex)`,
        hexId: hex.data.id,
      });
    }

    // Check hidden site clues
    const hiddenSiteClues = extractClueIdsFromHiddenSites(hex.data);
    for (const { clueId } of hiddenSiteClues) {
      addUsage(clueId, {
        type: 'hex-hidden-site',
        id: hex.data.id,
        name: `${hex.data.name} (Hidden Site)`,
        hexId: hex.data.id,
      });
    }

    // Check dream-clue notes
    const noteClues = extractClueIdsFromNotes(hex.data);
    for (const { clueId } of noteClues) {
      addUsage(clueId, {
        type: 'hex-dream',
        id: hex.data.id,
        name: `${hex.data.name} (Hex)`,
        hexId: hex.data.id,
      });
    }

    // Check keyed encounters that reference encounters with clues
    if (hex.data.keyedEncounters) {
      for (const keyedEncounter of hex.data.keyedEncounters) {
        const encounter = encounterMap.get(keyedEncounter.encounterId);
        if (encounter?.clues) {
          for (const clueId of extractClueIds(encounter.clues)) {
            addUsage(clueId, {
              type: 'hex-keyed-encounter',
              id: hex.data.id,
              name: `${hex.data.name} (Encounter)`,
              hexId: hex.data.id,
            });
          }
        }
      }
    }
  }

  // Scan dungeons
  for (const dungeon of dungeons) {
    if (dungeon.data.clues) {
      for (const clueId of extractClueIds(dungeon.data.clues)) {
        addUsage(clueId, {
          type: 'dungeon',
          id: dungeon.data.id,
          name: `${dungeon.data.name} (Dungeon)`,
        });
      }
    }
  }

  // Scan pointcrawl nodes
  for (const node of pointcrawlNodes) {
    if (node.data.clues) {
      for (const clueId of extractClueIds(node.data.clues)) {
        addUsage(clueId, {
          type: 'pointcrawl-node',
          id: `${node.data.pointcrawlId}/${node.data.id}`,
          name: `${node.data.name} (Pointcrawl Node)`,
        });
      }
    }
  }

  // Scan characters
  for (const character of characters) {
    if (character.data.clues) {
      for (const clueId of extractClueIds(character.data.clues)) {
        addUsage(clueId, {
          type: 'character',
          id: character.data.id,
          name: `${character.data.displayName} (Character)`,
        });
      }
    }
  }

  // Scan NPCs
  for (const npc of npcs) {
    if (npc.data.clues) {
      for (const clueId of extractClueIds(npc.data.clues)) {
        addUsage(clueId, {
          type: 'npc',
          id: npc.data.id,
          name: `${npc.data.name} (NPC)`,
        });
      }
    }
  }

  // Scan plotlines
  for (const plotline of plotlines) {
    if (plotline.data.clues) {
      for (const clueId of extractClueIds(plotline.data.clues)) {
        addUsage(clueId, {
          type: 'plotline',
          id: plotline.data.slug,
          name: `${plotline.data.title} (Plotline)`,
        });
      }
    }
  }

  return usageMap;
}

/**
 * Gets usage references for a specific clue.
 */
export function getClueUsage(
  usageMap: ClueUsageMap,
  clueId: string,
): ClueUsageReference[] {
  return usageMap.get(clueId) || [];
}

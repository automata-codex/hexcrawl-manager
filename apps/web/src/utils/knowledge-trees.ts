import { getCollection } from 'astro:content';

import type {
  FlatKnowledgeTree,
  PlacementMap,
  PlacementType,
} from '../types.ts';
import type {
  DungeonData,
  EncounterData,
  FloatingClueData,
  HexData,
  KnowledgeNodeData,
  PointcrawlNodeData,
} from '@skyreach/schemas';

export function buildPlacementMap(
  hexes: HexData[],
  dungeons: DungeonData[],
  floatingClues: FloatingClueData[],
  pointcrawlNodes: PointcrawlNodeData[],
  encounters: EncounterData[],
): PlacementMap {
  const placementMap: PlacementMap = {};

  // Hex-level unlocks (e.g., from landmarks)
  for (const hex of hexes) {
    const ref = { type: 'hex' as PlacementType, id: hex.id, label: hex.name };
    const unlockKeys =
      typeof hex.landmark === 'string' ? [] : hex.landmark.unlocks;
    for (const unlockKey of unlockKeys ?? []) {
      placementMap[unlockKey] ||= [];
      placementMap[unlockKey].push(ref);
    }

    // Hidden sites within hex
    for (const site of hex.hiddenSites ?? []) {
      const siteRef = {
        type: 'hidden-site' as PlacementType,
        id: hex.id,
        label: hex.name,
      };
      const siteUnlockKeys = typeof site === 'string' ? [] : site.unlocks;
      for (const unlockKey of siteUnlockKeys ?? []) {
        placementMap[unlockKey] ||= [];
        placementMap[unlockKey].push(siteRef);
      }
    }
  }

  // Dungeons
  for (const dungeon of dungeons) {
    const ref = {
      type: 'dungeon' as PlacementType,
      id: dungeon.id,
      label: dungeon.name,
    };
    for (const unlockKey of dungeon.unlocks ?? []) {
      placementMap[unlockKey] ||= [];
      placementMap[unlockKey].push(ref);
    }
  }

  // Floating clues
  for (const clue of floatingClues) {
    const ref = {
      type: 'floating-clue' as PlacementType,
      id: clue.id,
      label: clue.name,
    };
    for (const unlockKey of clue.unlocks ?? []) {
      placementMap[unlockKey] ||= [];
      placementMap[unlockKey].push(ref);
    }
  }

  // Pointcrawl nodes
  for (const node of pointcrawlNodes) {
    const ref = {
      type: 'pointcrawl-node' as PlacementType,
      id: `${node.pointcrawlId}/${node.id}`,
      label: node.name,
    };
    for (const unlockKey of node.unlocks ?? []) {
      placementMap[unlockKey] ||= [];
      placementMap[unlockKey].push(ref);
    }
  }

  // Encounters
  for (const encounter of encounters) {
    const ref = {
      type: 'encounter' as PlacementType,
      id: encounter.id,
      label: encounter.name,
    };
    for (const unlockKey of encounter.unlocks ?? []) {
      placementMap[unlockKey] ||= [];
      placementMap[unlockKey].push(ref);
    }
  }

  return placementMap;
}

export function flattenKnowledgeTree(
  node: KnowledgeNodeData,
  prefix: string[] = [],
): FlatKnowledgeTree {
  const id = [...prefix, node.id].join('.');
  const result: FlatKnowledgeTree = {
    [id]: {
      ...node,
      children: undefined,
    },
  };
  if (node.children) {
    for (const child of node.children) {
      Object.assign(result, flattenKnowledgeTree(child, [...prefix, node.id]));
    }
  }
  return result;
}

/**
 * Get all knowledge trees as a record keyed by tree ID.
 */
export async function getKnowledgeTrees(): Promise<
  Record<string, KnowledgeNodeData>
> {
  const entries = await getCollection('knowledge-trees');
  const trees: Record<string, KnowledgeNodeData> = {};
  for (const entry of entries) {
    trees[entry.id] = entry.data;
  }
  return trees;
}

/**
 * Get a single knowledge tree by ID.
 */
export async function getKnowledgeTree(
  id: string,
): Promise<KnowledgeNodeData | undefined> {
  const trees = await getKnowledgeTrees();
  return trees[id];
}

/**
 * Get all knowledge trees as flattened lookup maps.
 */
export async function getFlatKnowledgeTrees(): Promise<
  Record<string, FlatKnowledgeTree>
> {
  const trees = await getKnowledgeTrees();
  const flatTrees: Record<string, FlatKnowledgeTree> = {};
  for (const [id, tree] of Object.entries(trees)) {
    flatTrees[id] = flattenKnowledgeTree(tree);
  }
  return flatTrees;
}

/**
 * Get a single flattened knowledge tree by ID.
 */
export async function getFlatKnowledgeTree(
  id: string,
): Promise<FlatKnowledgeTree | undefined> {
  const tree = await getKnowledgeTree(id);
  if (!tree) return undefined;
  return flattenKnowledgeTree(tree);
}

/**
 * Navigate to a specific node in the tree by path segments and return it (with children intact).
 */
export function getNodeFromTree(
  tree: KnowledgeNodeData,
  segments: string[],
): KnowledgeNodeData | undefined {
  let current = tree;

  // Skip first segment (it's the tree root ID, which matches tree.id)
  for (let i = 1; i < segments.length; i++) {
    const child = current.children?.find((c) => c.id === segments[i]);
    if (!child) return undefined;
    current = child;
  }

  return current;
}

/**
 * Build ancestry chain for a node (for breadcrumbs).
 */
export function getAncestry(
  flatTree: FlatKnowledgeTree,
  nodeKey: string,
): Array<{ key: string; name: string }> {
  const segments = nodeKey.split('.');
  return segments.map((_, index) => {
    const key = segments.slice(0, index + 1).join('.');
    return {
      key,
      name: flatTree[key]?.name ?? key,
    };
  });
}

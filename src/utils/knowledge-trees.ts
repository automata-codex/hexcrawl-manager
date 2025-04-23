import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { KnowledgeNodeSchema } from '../../schemas/knowledge-node';
import type {
  DungeonData,
  FlatKnowledgeTree,
  FloatingClueData,
  HexData,
  KnowledgeNodeData,
  PlacementMap,
  PlacementType,
} from '../types.ts';

export function buildPlacementMap(
  hexes: HexData[],
  dungeons: DungeonData[],
  floatingClues: FloatingClueData[],
): PlacementMap {
  const placementMap: PlacementMap = {};

  // Hex-level unlocks (e.g., from landmarks)
  for (const hex of hexes) {
    const ref = { type: 'hex' as PlacementType, id: hex.id, label: hex.name };
    const unlockKeys = typeof hex.landmark === 'string' ? [] : hex.landmark.unlocks;
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
    }
    for (const unlockKey of clue.unlocks ?? []) {
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
  const id = [ ...prefix, node.id ].join('.');
  const result: FlatKnowledgeTree = {
    [id]: {
      ...node,
      children: undefined,
    },
  };
  if (node.children) {
    for (const child of node.children) {
      Object.assign(result, flattenKnowledgeTree(child, [ ...prefix, node.id ]));
    }
  }
  return result;
}

const knowledgeTrees: Record<string, KnowledgeNodeData> = {};
const flatKnowledgeTrees: Record<string, FlatKnowledgeTree> = {};

const dir = path.resolve('data/knowledge-trees');
const files = fs.readdirSync(dir).filter(file => /\.ya?ml$/.test(file));

for (const file of files) {
  const rootId = file.replace(/\.ya?ml$/, '');
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const parsed = yaml.parse(content);
  knowledgeTrees[rootId] = KnowledgeNodeSchema.parse(parsed);
  flatKnowledgeTrees[rootId] = flattenKnowledgeTree(knowledgeTrees[rootId]);
}

export { flatKnowledgeTrees, knowledgeTrees };

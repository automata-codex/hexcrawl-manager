import {
  getDungeonPath,
  getEncounterPath,
  getFloatingCluePath,
  getHexPath,
  getPointcrawlEdgePath,
  getPointcrawlNodePath,
  getPointcrawlPath,
} from '../config/routes.js';

import type { PlacementRef } from '../types.js';

/**
 * Generate a link URL for a placement reference.
 */
export function generateLink(ref: PlacementRef): string {
  switch (ref.type) {
    case 'dungeon':
      return getDungeonPath(ref.id);
    case 'encounter':
      return getEncounterPath(ref.id);
    case 'floating-clue':
      return getFloatingCluePath(ref.id);
    case 'hex':
      return getHexPath(ref.id);
    case 'hidden-site':
      return getHexPath(ref.id);
    case 'pointcrawl':
      return getPointcrawlPath(ref.id);
    case 'pointcrawl-node':
      return getPointcrawlNodePath(ref.id);
    case 'pointcrawl-edge':
      return getPointcrawlEdgePath(ref.id);
    default:
      throw new Error(`Unknown reference type: ${(ref as PlacementRef).type}`);
  }
}

/**
 * Generate a label appendix (type indicator) for a placement reference.
 */
export function generateLabelAppendix(ref: PlacementRef): string {
  switch (ref.type) {
    case 'dungeon':
      return '(Dungeon)';
    case 'encounter':
      return '(Encounter)';
    case 'floating-clue':
      return '(Floating Clue)';
    case 'hex':
      return '(Landmark)';
    case 'hidden-site':
      return '(Hidden Site)';
    case 'pointcrawl':
      return '(Pointcrawl)';
    case 'pointcrawl-node':
      return '(Pointcrawl Node)';
    case 'pointcrawl-edge':
      return '(Pointcrawl Edge)';
    default:
      throw new Error(`Unknown reference type: ${(ref as PlacementRef).type}`);
  }
}

import {
  getTravelDifficulty,
  isDifficultTerrain,
  normalizeHexId,
} from '@achm/core';
import { loadMapConfig, readAndValidateYaml } from '@achm/data';
import { HexSchema } from '@achm/schemas';

import { buildHexFileIndex } from '../../../services/hexes.service';

// Lazy-initialized hex index cache
let hexIndex: Record<string, string> | null = null;

function getHexIndex(): Record<string, string> {
  if (!hexIndex) {
    hexIndex = buildHexFileIndex();
  }
  return hexIndex;
}

/**
 * Check if a hex has difficult terrain that doubles travel time.
 * Returns false if hex data cannot be loaded.
 */
export function isDifficultHex(hexId: string): boolean {
  const notation = loadMapConfig().grid.notation;
  const normalizedId = normalizeHexId(hexId, notation);
  const filePath = getHexIndex()[normalizedId];
  if (!filePath) {
    return false; // Unknown hex, assume not difficult
  }

  try {
    const hex = readAndValidateYaml(filePath, HexSchema);
    const difficulty = getTravelDifficulty(hex.biome, hex.terrain);
    return isDifficultTerrain(difficulty);
  } catch {
    return false; // Error loading hex, assume not difficult
  }
}

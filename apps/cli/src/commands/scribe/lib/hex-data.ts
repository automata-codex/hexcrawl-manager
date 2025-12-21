import {
  getTravelDifficulty,
  isDifficultTerrain,
  normalizeHexId,
} from '@achm/core';
import { readAndValidateYaml } from '@achm/data';
import { HexSchema } from '@achm/schemas';

import { buildHexFileIndex } from '../../../services/hexes.service';

// Cache the hex index at module load for performance
const hexIndex = buildHexFileIndex();

/**
 * Check if a hex has difficult terrain that doubles travel time.
 * Returns false if hex data cannot be loaded.
 */
export function isDifficultHex(hexId: string): boolean {
  const normalizedId = normalizeHexId(hexId);
  const filePath = hexIndex[normalizedId];
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

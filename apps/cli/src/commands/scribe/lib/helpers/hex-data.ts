import { getTravelDifficulty, isDifficultTerrain } from '@skyreach/core';
import { readAndValidateYaml } from '@skyreach/data';
import { HexSchema } from '@skyreach/schemas';

import { buildHexFileIndex } from '../../../../services/hexes.service';

// Cache the hex index at module load for performance
const hexIndex = buildHexFileIndex();

/**
 * Check if a hex has difficult terrain that doubles travel time.
 * Returns false if hex data cannot be loaded.
 */
export function isDifficultHex(hexId: string): boolean {
  const filePath = hexIndex[hexId];
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

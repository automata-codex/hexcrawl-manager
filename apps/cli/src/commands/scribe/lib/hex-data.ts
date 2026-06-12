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
 * Read a hex's own `encounterChance` (d20 threshold), if it sets one.
 * Returns undefined if the hex is unknown, fails to load, or has no value.
 */
export function getHexEncounterChance(hexId: string): number | undefined {
  const notation = loadMapConfig().grid.notation;
  const normalizedId = normalizeHexId(hexId, notation);
  const filePath = getHexIndex()[normalizedId];
  if (!filePath) {
    return undefined;
  }

  try {
    const hex = readAndValidateYaml(filePath, HexSchema);
    return hex.encounterChance;
  } catch {
    return undefined;
  }
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

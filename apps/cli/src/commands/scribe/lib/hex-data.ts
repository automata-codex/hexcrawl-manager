import {
  getTravelDifficulty,
  isDifficultTerrain,
  normalizeHexId,
} from '@achm/core';
import { loadMapConfig, readAndValidateYaml } from '@achm/data';
import { HexSchema, type HexData } from '@achm/schemas';

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
 * Load and validate a hex's data file by hex id.
 * Returns null if the hex is unknown or fails to load/validate.
 */
export function loadHexData(hexId: string): HexData | null {
  const notation = loadMapConfig().grid.notation;
  const normalizedId = normalizeHexId(hexId, notation);
  const filePath = getHexIndex()[normalizedId];
  if (!filePath) {
    return null;
  }

  try {
    // readAndValidateYaml's generic can't express schemas whose input and
    // output differ (HexMapIcon's defaulted `layer`); the parsed value is
    // the output shape at runtime.
    return readAndValidateYaml(filePath, HexSchema) as HexData;
  } catch {
    return null;
  }
}

/**
 * Read a hex's own `encounterChance` (d20 threshold), if it sets one.
 * Returns undefined if the hex is unknown, fails to load, or has no value.
 */
export function getHexEncounterChance(hexId: string): number | undefined {
  return loadHexData(hexId)?.encounterChance;
}

/**
 * Check if a hex has difficult terrain that doubles travel time.
 * Returns false if hex data cannot be loaded.
 */
export function isDifficultHex(hexId: string): boolean {
  const hex = loadHexData(hexId);
  if (!hex) {
    return false; // Unknown hex, assume not difficult
  }
  const difficulty = getTravelDifficulty(hex.biome, hex.terrain);
  return isDifficultTerrain(difficulty);
}

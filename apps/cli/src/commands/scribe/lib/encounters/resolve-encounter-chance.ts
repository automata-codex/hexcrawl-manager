import { warn } from '@achm/cli-kit';
import { normalizeHexId } from '@achm/core';
import { loadMapConfig } from '@achm/data';

import { buildHexRegionIndex } from '../../../../services/regions.service';
import { getHexEncounterChance } from '../hex-data';

import type { HexRegionInfo } from '../../../../services/regions.service';

/**
 * Default d20 threshold when neither the hex nor any region defines one:
 * 0 means an encounter never occurs (practically every hex belongs to a
 * region, so this should not come up; we warn when it does).
 */
const DEFAULT_ENCOUNTER_CHANCE = 0;

// Lazy-initialized hex → region index cache
let hexRegionIndex: Record<string, HexRegionInfo> | null = null;

function getHexRegionIndex(): Record<string, HexRegionInfo> {
  if (!hexRegionIndex) {
    hexRegionIndex = buildHexRegionIndex();
  }
  return hexRegionIndex;
}

/**
 * Resolve the d20 encounter-chance threshold for entering a hex: the hex's
 * own `encounterChance` if set, else its region's, else a default of 0
 * (never) with a warning.
 */
export function resolveEncounterChance(hexId: string): number {
  const hexChance = getHexEncounterChance(hexId);
  if (hexChance !== undefined) {
    return hexChance;
  }

  const notation = loadMapConfig().grid.notation;
  const regionInfo = getHexRegionIndex()[normalizeHexId(hexId, notation)];
  if (regionInfo) {
    return regionInfo.encounterChance;
  }

  warn(
    `No encounterChance found for hex ${hexId} (not set on the hex, and the hex is not in any region); defaulting to ${DEFAULT_ENCOUNTER_CHANCE} (never).`,
  );
  return DEFAULT_ENCOUNTER_CHANCE;
}

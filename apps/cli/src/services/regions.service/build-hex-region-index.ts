import { warn } from '@achm/cli-kit';
import { normalizeHexId } from '@achm/core';
import { loadMapConfig, REPO_PATHS, readAndValidateYaml } from '@achm/data';
import { RegionSchema } from '@achm/schemas';
import { glob } from 'glob';
import path from 'node:path';

/** Region membership info for a single hex. */
export interface HexRegionInfo {
  regionId: string;
  encounterChance: number;
}

/**
 * Build an index mapping normalized hex IDs to their region's id and
 * encounter chance, from each region's `hexes` membership list.
 * Supports both .yml and .yaml extensions.
 */
export function buildHexRegionIndex(
  root = REPO_PATHS.REGIONS(),
): Record<string, HexRegionInfo> {
  const notation = loadMapConfig().grid.notation;
  // Support both .yml and .yaml extensions
  const files = [
    ...glob.sync(path.join(root, '**/*.yml')),
    ...glob.sync(path.join(root, '**/*.yaml')),
  ];
  const index: Record<string, HexRegionInfo> = {};

  for (const file of files) {
    let region;
    try {
      region = readAndValidateYaml(file, RegionSchema);
    } catch (e: unknown) {
      warn(
        `Skipping invalid region file ${file}: ${e instanceof Error ? e.message : e}`,
      );
      continue;
    }
    for (const hexId of region.hexes) {
      index[normalizeHexId(hexId, notation)] = {
        regionId: region.id,
        encounterChance: region.encounterChance,
      };
    }
  }

  return index;
}

#!/usr/bin/env tsx
/**
 * Migration script: Generate region hex lists
 *
 * This script reads all existing hex files, groups them by regionId,
 * and updates region files with:
 * - hexes: array of hex IDs belonging to the region
 * - terrain: most common terrain value (as default)
 * - biome: most common biome value (as default)
 *
 * Usage:
 *   npx tsx scripts/one-time-scripts/migrate-region-hexes.ts --dry-run
 *   npx tsx scripts/one-time-scripts/migrate-region-hexes.ts
 */

import { compareHexIds } from '@achm/core';
import { getDataPath } from '@achm/data';
import { HexSchema, RegionSchema } from '@achm/schemas';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';

const DATA_DIR = getDataPath();
const HEXES_DIR = path.join(DATA_DIR, 'hexes');
const REGIONS_DIR = path.join(DATA_DIR, 'regions');

interface HexFile {
  id: string;
  regionId: string;
  terrain?: string;
  biome?: string;
  path: string;
}

interface RegionUpdate {
  hexes: string[];
  terrain?: string;
  biome?: string;
}

function loadAllHexFiles(): HexFile[] {
  const hexFiles: HexFile[] = [];

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml')) {
        try {
          const content = yaml.parse(fs.readFileSync(fullPath, 'utf-8'));
          const result = HexSchema.safeParse(content);
          if (result.success && result.data.regionId) {
            hexFiles.push({
              id: result.data.id,
              regionId: result.data.regionId,
              terrain: result.data.terrain,
              biome: result.data.biome,
              path: fullPath,
            });
          }
        } catch (e) {
          console.warn(`Failed to parse ${fullPath}: ${(e as Error).message}`);
        }
      }
    }
  }

  scanDir(HEXES_DIR);
  return hexFiles;
}

function getMostCommon(counts: Map<string, number>): string | undefined {
  let maxCount = 0;
  let maxKey: string | undefined;
  for (const [key, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxKey = key;
    }
  }
  return maxKey;
}

function groupHexesByRegion(hexFiles: HexFile[]): Map<string, RegionUpdate> {
  const hexesByRegion = new Map<string, HexFile[]>();

  // Group hexes by region
  for (const hex of hexFiles) {
    const list = hexesByRegion.get(hex.regionId) || [];
    list.push(hex);
    hexesByRegion.set(hex.regionId, list);
  }

  // Build region updates with hex lists and defaults
  const updates = new Map<string, RegionUpdate>();

  for (const [regionId, hexes] of hexesByRegion) {
    // Sort hex IDs
    const hexIds = hexes
      .map((h) => h.id.toLowerCase())
      .sort((a, b) => compareHexIds(a, b, 'letter-number'));

    // Count terrain and biome occurrences
    const terrainCounts = new Map<string, number>();
    const biomeCounts = new Map<string, number>();

    for (const hex of hexes) {
      if (hex.terrain) {
        terrainCounts.set(hex.terrain, (terrainCounts.get(hex.terrain) || 0) + 1);
      }
      if (hex.biome) {
        biomeCounts.set(hex.biome, (biomeCounts.get(hex.biome) || 0) + 1);
      }
    }

    updates.set(regionId, {
      hexes: hexIds,
      terrain: getMostCommon(terrainCounts),
      biome: getMostCommon(biomeCounts),
    });
  }

  return updates;
}

function updateRegionFile(
  regionId: string,
  update: RegionUpdate,
  dryRun: boolean,
): boolean {
  const filePath = path.join(REGIONS_DIR, `${regionId}.yml`);

  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠️  Region file not found: ${filePath}`);
    return false;
  }

  // Read existing file content as string to preserve formatting
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const data = yaml.parse(fileContent);

  // Validate it's a valid region
  const result = RegionSchema.safeParse(data);
  if (!result.success) {
    console.warn(`  ⚠️  Invalid region file: ${filePath}`);
    return false;
  }

  // Update the data
  data.hexes = update.hexes;
  if (update.terrain) {
    data.terrain = update.terrain;
  }
  if (update.biome) {
    data.biome = update.biome;
  }

  if (dryRun) {
    console.log(`  Would update ${filePath}`);
    console.log(`    hexes: [${update.hexes.length} items]`);
    console.log(`    terrain: ${update.terrain || '(none)'}`);
    console.log(`    biome: ${update.biome || '(none)'}`);
  } else {
    // Write back with yaml library
    const doc = new yaml.Document(data);
    fs.writeFileSync(filePath, String(doc), 'utf-8');
    console.log(`  ✅ Updated ${filePath}`);
  }

  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    console.log('=== DRY RUN MODE ===\n');
  }

  console.log('Loading hex files...');
  const hexFiles = loadAllHexFiles();
  console.log(`Found ${hexFiles.length} hex files\n`);

  console.log('Grouping hexes by region...');
  const updates = groupHexesByRegion(hexFiles);
  console.log(`Found ${updates.size} regions with hexes\n`);

  console.log('Updating region files...');
  let successCount = 0;
  let failCount = 0;

  for (const [regionId, update] of updates) {
    console.log(`\nRegion ${regionId}:`);
    console.log(`  Hexes: ${update.hexes.length}`);
    console.log(`  Default terrain: ${update.terrain || '(none)'}`);
    console.log(`  Default biome: ${update.biome || '(none)'}`);

    if (updateRegionFile(regionId, update, dryRun)) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total hexes: ${hexFiles.length}`);
  console.log(`Regions updated: ${successCount}`);
  if (failCount > 0) {
    console.log(`Regions failed: ${failCount}`);
  }

  if (dryRun) {
    console.log('\nRun without --dry-run to apply changes.');
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

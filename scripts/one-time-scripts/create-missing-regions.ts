#!/usr/bin/env tsx
/**
 * Migration script: Create missing region files
 *
 * This script creates stub region files for regions that are referenced
 * in hex files but don't have region data files yet.
 *
 * Usage:
 *   npx tsx scripts/one-time-scripts/create-missing-regions.ts --dry-run
 *   npx tsx scripts/one-time-scripts/create-missing-regions.ts
 */

import { compareHexIds } from '@achm/core';
import { getDataPath } from '@achm/data';
import { HexSchema } from '@achm/schemas';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';

const DATA_DIR = getDataPath();
const HEXES_DIR = path.join(DATA_DIR, 'hexes');
const REGIONS_DIR = path.join(DATA_DIR, 'regions');

// Region metadata from CSV
const REGION_METADATA: Record<
  number,
  { type: string; contentDensity: number; treasureRating: number }
> = {
  1: { type: 'skyreach', contentDensity: 1, treasureRating: 3 },
  2: { type: 'skyreach', contentDensity: 1, treasureRating: 1 },
  3: { type: 'skyreach', contentDensity: 1, treasureRating: 1 },
  4: { type: 'mid-frontier', contentDensity: 3, treasureRating: 3 },
  5: { type: 'mid-frontier', contentDensity: 4, treasureRating: 4 },
  6: { type: 'starting', contentDensity: 4, treasureRating: 2 },
  7: { type: 'mid-frontier', contentDensity: 4, treasureRating: 3 },
  8: { type: 'starting', contentDensity: 4, treasureRating: 1 },
  9: { type: 'starting', contentDensity: 4, treasureRating: 3 },
  10: { type: 'starting', contentDensity: 4, treasureRating: 2 },
  11: { type: 'starting', contentDensity: 4, treasureRating: 3 },
  12: { type: 'mid-frontier', contentDensity: 3, treasureRating: 3 },
  13: { type: 'mid-frontier', contentDensity: 3, treasureRating: 4 },
  14: { type: 'mid-frontier', contentDensity: 4, treasureRating: 3 },
  15: { type: 'mid-frontier', contentDensity: 3, treasureRating: 4 },
  16: { type: 'mid-frontier', contentDensity: 3, treasureRating: 3 },
  17: { type: 'mid-frontier', contentDensity: 4, treasureRating: 4 },
  18: { type: 'mid-frontier', contentDensity: 3, treasureRating: 3 },
  19: { type: 'mid-frontier', contentDensity: 3, treasureRating: 4 },
  20: { type: 'mid-frontier', contentDensity: 4, treasureRating: 3 },
  21: { type: 'deep-frontier', contentDensity: 2, treasureRating: 5 },
  22: { type: 'deep-frontier', contentDensity: 3, treasureRating: 5 },
  23: { type: 'deep-frontier', contentDensity: 2, treasureRating: 4 },
  24: { type: 'deep-frontier', contentDensity: 3, treasureRating: 4 },
  25: { type: 'deep-frontier', contentDensity: 2, treasureRating: 5 },
  26: { type: 'deep-frontier', contentDensity: 3, treasureRating: 4 },
  27: { type: 'mid-frontier', contentDensity: 4, treasureRating: 3 },
  28: { type: 'deep-frontier', contentDensity: 2, treasureRating: 4 },
  29: { type: 'deep-frontier', contentDensity: 3, treasureRating: 4 },
  30: { type: 'deep-frontier', contentDensity: 2, treasureRating: 5 },
  31: { type: 'deep-frontier', contentDensity: 3, treasureRating: 5 },
  32: { type: 'deep-frontier', contentDensity: 2, treasureRating: 5 },
  33: { type: 'deep-frontier', contentDensity: 3, treasureRating: 4 },
  34: { type: 'mythic-realm', contentDensity: 4, treasureRating: 5 },
  35: { type: 'deep-frontier', contentDensity: 3, treasureRating: 4 },
  36: { type: 'deep-frontier', contentDensity: 3, treasureRating: 4 },
  37: { type: 'mythic-realm', contentDensity: 5, treasureRating: 5 },
  38: { type: 'deep-frontier', contentDensity: 2, treasureRating: 4 },
  39: { type: 'deep-frontier', contentDensity: 2, treasureRating: 4 },
  40: { type: 'deep-frontier', contentDensity: 3, treasureRating: 5 },
  41: { type: 'deep-frontier', contentDensity: 2, treasureRating: 5 },
  42: { type: 'deep-frontier', contentDensity: 2, treasureRating: 5 },
  43: { type: 'deep-frontier', contentDensity: 3, treasureRating: 4 },
  44: { type: 'deep-frontier', contentDensity: 2, treasureRating: 4 },
  45: { type: 'deep-frontier', contentDensity: 3, treasureRating: 5 },
  46: { type: 'mythic-realm', contentDensity: 3, treasureRating: 5 },
  47: { type: 'deep-frontier', contentDensity: 3, treasureRating: 4 },
  48: { type: 'deep-frontier', contentDensity: 2, treasureRating: 4 },
  49: { type: 'deep-frontier', contentDensity: 3, treasureRating: 5 },
  50: { type: 'deep-frontier', contentDensity: 2, treasureRating: 4 },
  51: { type: 'deep-frontier', contentDensity: 3, treasureRating: 5 },
  52: { type: 'deep-frontier', contentDensity: 2, treasureRating: 4 },
  53: { type: 'deep-frontier', contentDensity: 3, treasureRating: 5 },
  54: { type: 'deep-frontier', contentDensity: 2, treasureRating: 4 },
  55: { type: 'deep-frontier', contentDensity: 3, treasureRating: 4 },
  56: { type: 'deep-frontier', contentDensity: 2, treasureRating: 4 },
  57: { type: 'deep-frontier', contentDensity: 2, treasureRating: 4 },
};

interface HexFile {
  id: string;
  regionId: string;
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

function getExistingRegions(): Set<string> {
  const existing = new Set<string>();
  if (!fs.existsSync(REGIONS_DIR)) return existing;

  const files = fs.readdirSync(REGIONS_DIR);
  for (const file of files) {
    if (file.endsWith('.yml') || file.endsWith('.yaml')) {
      // Extract region ID from filename (e.g., "region-10.yml" -> "region-10")
      const id = file.replace(/\.(yml|yaml)$/, '');
      existing.add(id);
    }
  }
  return existing;
}

function parseRegionNumber(regionId: string): number | undefined {
  const match = regionId.match(/^region-(\d+)$/);
  return match ? parseInt(match[1], 10) : undefined;
}

function createRegionFile(
  regionId: string,
  hexes: HexFile[],
  dryRun: boolean,
): boolean {
  const filePath = path.join(REGIONS_DIR, `${regionId}.yml`);
  const regionNum = parseRegionNumber(regionId);

  // Get metadata from CSV or use defaults
  const metadata = regionNum ? REGION_METADATA[regionNum] : undefined;
  const type = metadata?.type ?? 'mid-frontier';
  const contentDensity = metadata?.contentDensity ?? 3;
  const treasureRating = metadata?.treasureRating ?? 3;

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

  const defaultTerrain = getMostCommon(terrainCounts);
  const defaultBiome = getMostCommon(biomeCounts);

  // Build region data
  const regionData: Record<string, unknown> = {
    id: regionId,
    name: `Region ${regionNum ?? regionId}`,
    description: 'TODO: Add description',
    haven: 'none',
    encounterChance: 8,
    type,
    contentDensity,
    treasureRating,
    hexes: hexIds,
  };

  if (defaultTerrain) {
    regionData.terrain = defaultTerrain;
  }
  if (defaultBiome) {
    regionData.biome = defaultBiome;
  }

  if (dryRun) {
    console.log(`  Would create ${filePath}`);
    console.log(`    type: ${type}`);
    console.log(`    contentDensity: ${contentDensity}`);
    console.log(`    treasureRating: ${treasureRating}`);
    console.log(`    hexes: [${hexIds.length} items]`);
    console.log(`    terrain: ${defaultTerrain || '(none)'}`);
    console.log(`    biome: ${defaultBiome || '(none)'}`);
  } else {
    // Ensure directory exists
    fs.mkdirSync(REGIONS_DIR, { recursive: true });

    const doc = new yaml.Document(regionData);
    fs.writeFileSync(filePath, String(doc), 'utf-8');
    console.log(`  ✅ Created ${filePath}`);
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

  console.log('Finding existing region files...');
  const existingRegions = getExistingRegions();
  console.log(`Found ${existingRegions.size} existing region files\n`);

  // Group hexes by region
  const hexesByRegion = new Map<string, HexFile[]>();
  for (const hex of hexFiles) {
    const list = hexesByRegion.get(hex.regionId) || [];
    list.push(hex);
    hexesByRegion.set(hex.regionId, list);
  }

  // Find missing regions
  const missingRegions: string[] = [];
  for (const regionId of hexesByRegion.keys()) {
    if (!existingRegions.has(regionId)) {
      missingRegions.push(regionId);
    }
  }

  // Sort by region number
  missingRegions.sort((a, b) => {
    const numA = parseRegionNumber(a) ?? 999;
    const numB = parseRegionNumber(b) ?? 999;
    return numA - numB;
  });

  console.log(`Found ${missingRegions.length} missing region files\n`);

  if (missingRegions.length === 0) {
    console.log('No missing regions to create.');
    return;
  }

  console.log('Creating missing region files...\n');
  let successCount = 0;

  for (const regionId of missingRegions) {
    const hexes = hexesByRegion.get(regionId) || [];
    console.log(`\n${regionId} (${hexes.length} hexes):`);

    if (createRegionFile(regionId, hexes, dryRun)) {
      successCount++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Regions created: ${successCount}`);

  if (dryRun) {
    console.log('\nRun without --dry-run to apply changes.');
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

#!/usr/bin/env tsx
/**
 * Migration script: Remove regionId from hex files
 *
 * This script removes the now-redundant `regionId` field from hex files,
 * since region membership is now defined in region files.
 *
 * Usage:
 *   npx tsx scripts/one-time-scripts/remove-hex-region-ids.ts --dry-run
 *   npx tsx scripts/one-time-scripts/remove-hex-region-ids.ts
 */

import { getDataPath } from '@achm/data';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';

const DATA_DIR = getDataPath();
const HEXES_DIR = path.join(DATA_DIR, 'hexes');

interface HexFileInfo {
  path: string;
  hexId: string;
  regionId: string;
}

function findHexFilesWithRegionId(): HexFileInfo[] {
  const files: HexFileInfo[] = [];

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const data = yaml.parse(content);

          if (data && typeof data === 'object' && 'regionId' in data) {
            files.push({
              path: fullPath,
              hexId: data.id || entry.name.replace(/\.(yml|yaml)$/, ''),
              regionId: data.regionId,
            });
          }
        } catch (e) {
          console.warn(`  ⚠️  Failed to parse ${fullPath}: ${(e as Error).message}`);
        }
      }
    }
  }

  scanDir(HEXES_DIR);
  return files;
}

function removeRegionIdFromFile(filePath: string, dryRun: boolean): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = yaml.parse(content);

    if (!data || typeof data !== 'object' || !('regionId' in data)) {
      return false;
    }

    // Remove regionId
    delete data.regionId;

    if (dryRun) {
      return true;
    }

    // Write back
    const doc = new yaml.Document(data);
    fs.writeFileSync(filePath, String(doc), 'utf-8');
    return true;
  } catch (e) {
    console.error(`  ❌ Failed to update ${filePath}: ${(e as Error).message}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    console.log('=== DRY RUN MODE ===\n');
  }

  console.log('Finding hex files with regionId...');
  const files = findHexFilesWithRegionId();
  console.log(`Found ${files.length} files with regionId\n`);

  if (files.length === 0) {
    console.log('No files need to be updated.');
    return;
  }

  // Group by regionId for summary
  const byRegion = new Map<string, HexFileInfo[]>();
  for (const file of files) {
    const list = byRegion.get(file.regionId) || [];
    list.push(file);
    byRegion.set(file.regionId, list);
  }

  console.log('Files by region:');
  const regions = Array.from(byRegion.keys()).sort((a, b) => {
    const numA = parseInt(a.replace('region-', '')) || 0;
    const numB = parseInt(b.replace('region-', '')) || 0;
    return numA - numB;
  });
  for (const region of regions) {
    console.log(`  ${region}: ${byRegion.get(region)!.length} files`);
  }
  console.log('');

  if (dryRun) {
    console.log('Sample files (first 10):');
    for (const file of files.slice(0, 10)) {
      const relPath = path.relative(HEXES_DIR, file.path);
      console.log(`  ${relPath} (regionId: ${file.regionId})`);
    }
    if (files.length > 10) {
      console.log(`  ... and ${files.length - 10} more`);
    }
  } else {
    console.log('Removing regionId from files...');

    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      if (removeRegionIdFromFile(file.path, dryRun)) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    console.log(`\n✅ Updated ${successCount} files`);
    if (errorCount > 0) {
      console.log(`❌ Failed: ${errorCount} files`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total files: ${files.length}`);
  console.log(`Regions: ${regions.length}`);

  if (dryRun) {
    console.log('\nRun without --dry-run to apply changes.');
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

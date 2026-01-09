#!/usr/bin/env tsx
/**
 * Migration script: Reorganize hex files by column
 *
 * This script moves hex files from `hexes/region-X/` to `hexes/col-X/` structure.
 * For example: hexes/region-1/f12.yml -> hexes/col-f/f12.yml
 *
 * Usage:
 *   npx tsx scripts/one-time-scripts/reorganize-hexes-by-column.ts --dry-run
 *   npx tsx scripts/one-time-scripts/reorganize-hexes-by-column.ts
 */

import { parseHexId } from '@achm/core';
import { getDataPath } from '@achm/data';
import * as fs from 'node:fs';
import * as path from 'node:path';

const DATA_DIR = getDataPath();
const HEXES_DIR = path.join(DATA_DIR, 'hexes');

interface HexFileMove {
  oldPath: string;
  newPath: string;
  hexId: string;
  column: string;
}

function findAllHexFiles(): HexFileMove[] {
  const moves: HexFileMove[] = [];

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip col-* directories (already migrated)
        if (entry.name.startsWith('col-')) {
          continue;
        }
        scanDir(fullPath);
      } else if (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml')) {
        // Extract hex ID and extension from filename (e.g., "f12.yaml" -> "f12", ".yaml")
        const ext = path.extname(entry.name);
        const hexId = entry.name.replace(/\.(yml|yaml)$/, '').toLowerCase();

        try {
          const coord = parseHexId(hexId, 'letter-number');
          const colLetter = String.fromCharCode(97 + coord.col); // 'a', 'b', etc.
          const newDir = path.join(HEXES_DIR, `col-${colLetter}`);
          const newPath = path.join(newDir, `${hexId}${ext}`);

          // Only add if it's actually moving
          if (fullPath !== newPath) {
            moves.push({
              oldPath: fullPath,
              newPath,
              hexId,
              column: colLetter,
            });
          }
        } catch (e) {
          console.warn(`  ⚠️  Could not parse hex ID from ${fullPath}: ${(e as Error).message}`);
        }
      }
    }
  }

  scanDir(HEXES_DIR);
  return moves;
}

function removeEmptyDirs(dir: string): void {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  // First, recursively clean subdirectories
  for (const entry of entries) {
    if (entry.isDirectory()) {
      removeEmptyDirs(path.join(dir, entry.name));
    }
  }

  // Then check if this directory is now empty (re-read after recursive cleanup)
  const remaining = fs.readdirSync(dir);
  if (remaining.length === 0 && dir !== HEXES_DIR) {
    fs.rmdirSync(dir);
    console.log(`  🗑️  Removed empty directory: ${dir}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    console.log('=== DRY RUN MODE ===\n');
  }

  console.log('Finding hex files to move...');
  const moves = findAllHexFiles();
  console.log(`Found ${moves.length} files to move\n`);

  if (moves.length === 0) {
    console.log('No files need to be moved.');
    return;
  }

  // Group by column for summary
  const byColumn = new Map<string, HexFileMove[]>();
  for (const move of moves) {
    const list = byColumn.get(move.column) || [];
    list.push(move);
    byColumn.set(move.column, list);
  }

  // Sort columns
  const columns = Array.from(byColumn.keys()).sort();

  console.log('Files by column:');
  for (const col of columns) {
    const files = byColumn.get(col)!;
    console.log(`  col-${col}: ${files.length} files`);
  }
  console.log('');

  if (dryRun) {
    console.log('Sample moves (first 10):');
    for (const move of moves.slice(0, 10)) {
      const relOld = path.relative(HEXES_DIR, move.oldPath);
      const relNew = path.relative(HEXES_DIR, move.newPath);
      console.log(`  ${relOld} -> ${relNew}`);
    }
    if (moves.length > 10) {
      console.log(`  ... and ${moves.length - 10} more`);
    }
  } else {
    console.log('Moving files...');

    // Create column directories
    for (const col of columns) {
      const colDir = path.join(HEXES_DIR, `col-${col}`);
      if (!fs.existsSync(colDir)) {
        fs.mkdirSync(colDir, { recursive: true });
        console.log(`  📁 Created ${colDir}`);
      }
    }

    // Move files
    let successCount = 0;
    let errorCount = 0;

    for (const move of moves) {
      try {
        fs.renameSync(move.oldPath, move.newPath);
        successCount++;
      } catch (e) {
        console.error(`  ❌ Failed to move ${move.oldPath}: ${(e as Error).message}`);
        errorCount++;
      }
    }

    console.log(`\nMoved ${successCount} files`);
    if (errorCount > 0) {
      console.log(`Failed: ${errorCount} files`);
    }

    // Remove empty directories
    console.log('\nCleaning up empty directories...');
    removeEmptyDirs(HEXES_DIR);
  }

  console.log('\n=== Summary ===');
  console.log(`Total files: ${moves.length}`);
  console.log(`Columns: ${columns.length} (${columns.join(', ')})`);

  if (dryRun) {
    console.log('\nRun without --dry-run to apply changes.');
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

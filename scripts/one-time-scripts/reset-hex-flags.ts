#!/usr/bin/env tsx
/**
 * Resets all exploration-related flags in hex YAML files.
 *
 * This script clears:
 * - isScouted
 * - isVisited
 * - isExplored
 * - 'landmark-known' tag
 *
 * Usage: tsx reset-hex-flags.ts [--dry-run]
 */

import { glob } from 'glob';
import { readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HEXES_DIR = path.resolve(__dirname, '../../data/hexes');
const LANDMARK_TAG = 'landmark-known';

interface HexDoc {
  id: string;
  isScouted?: boolean;
  isVisited?: boolean;
  isExplored?: boolean;
  tags?: string[];
  [key: string]: any;
}

async function resetHexFlags(dryRun = false) {
  const pattern = path.join(HEXES_DIR, '**/*.{yml,yaml}');
  const files = glob.sync(pattern);

  console.log(`🔍 Found ${files.length} hex files in ${HEXES_DIR}\n`);

  let modifiedCount = 0;
  let unchangedCount = 0;

  for (const filePath of files) {
    try {
      const content = await readFile(filePath, 'utf8');
      const doc = yaml.parse(content) as HexDoc;

      if (!doc || typeof doc !== 'object') {
        console.warn(`⚠️  Skipping ${filePath}: not a valid object`);
        continue;
      }

      // Track what needs to be changed
      const changes: string[] = [];

      // Remove exploration flags
      if (doc.isScouted === true) {
        changes.push('isScouted');
        delete doc.isScouted;
      }
      if (doc.isVisited === true) {
        changes.push('isVisited');
        delete doc.isVisited;
      }
      if (doc.isExplored === true) {
        changes.push('isExplored');
        delete doc.isExplored;
      }

      // Remove landmark-known tag
      if (Array.isArray(doc.tags)) {
        const beforeLength = doc.tags.length;
        doc.tags = doc.tags.filter((tag) => tag !== LANDMARK_TAG);

        if (doc.tags.length < beforeLength) {
          changes.push('landmark-known tag');
        }

        // Clean up empty tags array
        if (doc.tags.length === 0) {
          delete doc.tags;
        }
      }

      if (changes.length > 0) {
        modifiedCount++;
        const hexId = doc.id || path.basename(filePath, path.extname(filePath));
        console.log(
          `${dryRun ? '📋' : '✅'} ${hexId}: cleared ${changes.join(', ')}`,
        );

        if (!dryRun) {
          await writeFile(filePath, yaml.stringify(doc), 'utf8');
        }
      } else {
        unchangedCount++;
      }
    } catch (err) {
      console.error(
        `❌ Failed to process ${filePath}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${dryRun ? '📋 DRY RUN COMPLETE' : '✨ RESET COMPLETE'}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Modified: ${modifiedCount} hexes`);
  console.log(`Unchanged: ${unchangedCount} hexes`);
  console.log(`Total: ${files.length} hexes`);

  if (dryRun) {
    console.log(`\n💡 Run without --dry-run to apply changes`);
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

resetHexFlags(dryRun).catch((err) => {
  console.error('💥 Script failed:', err);
  process.exit(1);
});

#!/usr/bin/env tsx

/**
 * Pre-build script: Cache AP totals for production builds
 *
 * Reads the AP ledger, aggregates totals per character, and writes
 * the result to .cache/ap-totals.json for fast runtime access.
 */

import {
  aggregateApByCharacter,
  readApLedger,
  REPO_PATHS,
} from '@skyreach/data';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ApTotalsCache } from '@skyreach/schemas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, '../.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'ap-totals.json');

async function main() {
  console.log('🔍 Caching AP totals for production build...');

  try {
    // Read AP ledger from repository
    const ledgerPath = REPO_PATHS.AP_LEDGER();
    console.log(`   Reading ledger: ${ledgerPath}`);

    if (!fs.existsSync(ledgerPath)) {
      console.error(`❌ AP ledger not found at ${ledgerPath}`);
      console.error('   Build cannot proceed without AP data.');
      console.error('   Please ensure the AP ledger exists before building.');
      process.exit(1);
    }

    const ledgerEntries = readApLedger(ledgerPath);
    console.log(`   Found ${ledgerEntries.length} ledger entries`);

    // Aggregate by character
    const aggregated = aggregateApByCharacter(ledgerEntries);
    console.log(`   Aggregated AP for ${Object.keys(aggregated).length} characters`);

    // Build cache structure
    const cache: ApTotalsCache = {
      lastUpdated: new Date().toISOString(),
      entries: Object.entries(aggregated).map(([characterId, totals]) => ({
        characterId,
        totals,
      })),
    };

    // Write cache file
    ensureCacheDir();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));

    console.log(`✅ AP totals cached to ${CACHE_FILE}`);
    console.log(`   Last updated: ${cache.lastUpdated}`);
  } catch (error) {
    console.error('❌ Failed to cache AP totals:', error);
    process.exit(1);
  }
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

main();

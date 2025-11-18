import {
  aggregateApByCharacter,
  readApLedger,
  REPO_PATHS,
} from '@skyreach/data';
import { ApTotalsCacheSchema } from '@skyreach/schemas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type ApPillarTotals = {
  combat: number;
  exploration: number;
  social: number;
};

export type ApTotalsMap = Record<string, ApPillarTotals>;

export interface ApTotalsResult {
  totals: ApTotalsMap;
  lastUpdated: string | null; // ISO timestamp (null in dev mode for live data)
  isLive: boolean; // true if reading directly from ledger
}

/**
 * Load AP totals for all characters.
 * - In dev mode (NODE_ENV !== 'production'): reads and aggregates AP ledger directly (always up-to-date)
 * - In production (NODE_ENV === 'production'): reads from pre-computed cache file (fast)
 *
 * Note: Vercel sets NODE_ENV=production for both production and preview deployments.
 */
export async function loadApTotals(): Promise<ApTotalsResult> {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    return loadFromCache();
  } else {
    return loadFromLedger();
  }
}

/**
 * Dev mode: Read ledger directly and aggregate in real-time
 */
function loadFromLedger(): ApTotalsResult {
  const ledgerPath = REPO_PATHS.AP_LEDGER();

  if (!fs.existsSync(ledgerPath)) {
    console.warn(`⚠️  AP ledger not found at ${ledgerPath}. Returning empty totals.`);
    return {
      totals: {},
      lastUpdated: null,
      isLive: true,
    };
  }

  const ledgerEntries = readApLedger(ledgerPath);
  return {
    totals: aggregateApByCharacter(ledgerEntries),
    lastUpdated: null, // null indicates live/current data
    isLive: true,
  };
}

/**
 * Production mode: Read from pre-computed cache
 */
function loadFromCache(): ApTotalsResult {
  // Use process.cwd() to get project root, then navigate to cache file
  // In Docker/production: process.cwd() = /app
  // Cache file is at: /app/apps/web/.cache/ap-totals.json
  const cacheFilePath = path.join(process.cwd(), 'apps/web/.cache/ap-totals.json');

  if (!fs.existsSync(cacheFilePath)) {
    throw new Error(
      `AP totals cache not found at ${cacheFilePath}. ` +
      `This should have been generated during the build process.`
    );
  }

  const cacheContent = fs.readFileSync(cacheFilePath, 'utf-8');
  const cache = ApTotalsCacheSchema.parse(JSON.parse(cacheContent));

  // Transform array of entries into a map
  const totalsMap: ApTotalsMap = {};
  for (const entry of cache.entries) {
    totalsMap[entry.characterId] = entry.totals;
  }

  return {
    totals: totalsMap,
    lastUpdated: cache.lastUpdated,
    isLive: false,
  };
}

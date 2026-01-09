import { error, info } from '@achm/cli-kit';
import { isSeasonId } from '@achm/core';
import {
  atomicWrite,
  buildRolloverDevFilename,
  buildRolloverFilename,
  REPO_PATHS,
} from '@achm/data';
import { ScribeEvent } from '@achm/schemas';
import fs from 'fs';
import path from 'path';

import { detectDevMode } from '../services/general';

import type { Context } from '../types';

// Helper: Check for session locks
function hasSessionLock(): boolean {
  const lockDir = path.resolve(REPO_PATHS.LOCKS());
  try {
    const files = fs.readdirSync(lockDir);
    return files.length > 0;
  } catch {
    // If lock dir doesn't exist, treat as no lock
    return false;
  }
}

export default function rollover(ctx: Context) {
  return async (args: string[]) => {
    if (ctx.file) {
      error('❌ Cannot rollover: active session detected.');
      process.exit(2);
    }
    if (ctx.sessionId) {
      error('❌ Cannot rollover: active session detected.');
      process.exit(2);
    }

    const seasonIdRaw = args[0]?.toLowerCase();
    const devMode = detectDevMode(args);

    if (!seasonIdRaw || !isSeasonId(seasonIdRaw)) {
      error(
        '❌ Invalid or missing season id. Format: YYYY-(spring|summer|autumn|winter)',
      );
      process.exit(4);
    }

    // if (hasSessionLock()) {
    //   error('❌ Cannot rollover: active session detected.');
    //   process.exit(2);
    // }

    // Output path resolution
    let outPath: string;
    if (devMode) {
      outPath = path.resolve(
        REPO_PATHS.DEV_ROLLOVERS(),
        buildRolloverDevFilename(seasonIdRaw),
      );
    } else {
      outPath = path.resolve(
        REPO_PATHS.ROLLOVERS(),
        buildRolloverFilename(seasonIdRaw),
      );
      if (fs.existsSync(outPath)) {
        info('Rollover file already exists. No action taken.');
        process.exit(0);
      }
    }

    // Write JSONL record
    const record: ScribeEvent = {
      seq: 1,
      ts: new Date().toISOString(),
      kind: 'season_rollover',
      payload: { seasonId: seasonIdRaw },
    };
    try {
      atomicWrite(outPath, JSON.stringify(record) + '\n');
      info(`Rollover file written: ${outPath}`);
      process.exit(0);
    } catch (e) {
      error(
        '❌ Failed to write rollover file: ' +
          (e instanceof Error ? e.message : String(e)),
      );
      process.exit(6);
    }
  };
}

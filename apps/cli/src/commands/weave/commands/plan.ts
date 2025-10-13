import { error, info } from '@skyreach/cli-kit';
import {
  assertSeasonId,
  assertSessionId,
  isSeasonId,
  isSessionId,
} from '@skyreach/core';

import { AlreadyAppliedError, NoChangesError } from '../lib/errors';
import { printApplyTrailsResult } from '../lib/printers';
import { resolveTrailsTarget } from '../lib/resolvers';

import { ApplyMode, exitCodeForApply } from './apply';
import { planTrails } from './plan-trails';

export type PlanArgs = {
  target?: string;
  allowDirty?: boolean;
  mode?: PlanMode;
};

export type PlanMode = 'all' | 'ap' | 'trails';

// TODO Exit code mapper

export async function plan(args: PlanArgs) {
  try {
    const { allowDirty, mode: rawMode, target: rawTarget } = args;
    const mode: ApplyMode = rawMode ?? 'all';

    let targetType: 'session' | 'season' | 'undefined' = 'undefined';
    let target: string | undefined = undefined;
    if (rawTarget) {
      if (isSessionId(rawTarget)) {
        targetType = 'session';
        target = assertSessionId(rawTarget);
      } else if (isSeasonId(rawTarget)) {
        targetType = 'season';
        target = assertSeasonId(rawTarget);
      } else {
        throw new Error(
          `Invalid target "${rawTarget}": must be a session ID (e.g. session-0042) or season ID (e.g. 1511-autumn).`,
        );
      }
    }

    if (mode === 'all' || mode === 'trails') {
      const items = resolveTrailsTarget(target);

      let applied = 0;
      let skipped = 0;

      for (const item of items) {
        try {
          const result = await planTrails({ allowDirty, file: item.file });
          printApplyTrailsResult(result);
          applied++;
        } catch (e) {
          if (e instanceof AlreadyAppliedError) {
            info(e.message);           // benign: continue
            skipped++;
            continue;
          }
          if (e instanceof NoChangesError) {
            info(e.message);           // benign: continue
            skipped++;
            continue;
          }
          // anything else is a real failure: let the outer catch handle exit code
          throw e;
        }
      }

      if (items.length > 1) {
        info(`Trail files: applied ${applied}, skipped ${skipped}.`);
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    error(message);
    process.exit(exitCodeForApply(e));
  }
}

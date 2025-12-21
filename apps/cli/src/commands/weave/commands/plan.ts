import { error, info, makeExitMapper } from '@achm/cli-kit';
import {
  SessionAlreadyAppliedError,
  SessionFingerprintMismatchError,
  SessionLogsNotFoundError,
  SessionReportValidationError,
  assertSeasonId,
  isSeasonId,
} from '@achm/core';
import {
  DirtyGitError,
  FinalizedLogJsonParseError,
  FinalizedLogsNotFoundError,
} from '@achm/data';
import {
  assertSessionId,
  isSessionId,
  SessionIdError,
} from '@achm/schemas';

import {
  AlreadyAppliedError,
  CliError,
  CliValidationError,
  NoChangesError,
} from '../lib/errors';
import { printApplyTrailsResult } from '../lib/printers';
import { resolveTrailsTarget } from '../lib/resolvers';

import { ApplyMode } from './apply';
import { planTrails } from './plan-trails';

export type PlanArgs = {
  target?: string;
  allowDirty?: boolean;
  mode?: PlanMode;
};

export type PlanMode = 'all' | 'ap' | 'trails';

export const exitCodeForPlan = makeExitMapper(
  [
    [CliValidationError, 4], // user input or file contents are invalid
    [DirtyGitError, 5], // external failure
    [FinalizedLogJsonParseError, 2], // invalid/corrupt input
    [FinalizedLogsNotFoundError, 3], // not found
    [SessionAlreadyAppliedError, 0], // benign no-op
    [NoChangesError, 5], // no-op error
    [SessionFingerprintMismatchError, 4], // conflicting state
    [SessionIdError, 2], // invalid session id or missing context
    [SessionLogsNotFoundError, 4], // domain-specific failure
    [SessionReportValidationError, 2], // usage: schema invalid

    // Keep the most generic types at the end to avoid masking more specific ones
    [CliError, 1], // generic
  ],
  1, // fallback default
);

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

          // Handle no-op results (sessions with no trail changes)
          if (result.status === 'no-op') {
            printApplyTrailsResult(result);
            skipped++;
            continue;
          }

          printApplyTrailsResult(result);
          applied++;
        } catch (e) {
          if (e instanceof AlreadyAppliedError) {
            info(e.message); // benign: continue
            skipped++;
            continue;
          }
          if (e instanceof NoChangesError) {
            // Legacy: shouldn't happen anymore but keep for safety
            info(e.message);
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
    process.exit(exitCodeForPlan(e));
  }
}

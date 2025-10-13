import { error, info, makeExitMapper } from '@skyreach/cli-kit';
import {
  SessionAlreadyAppliedError,
  SessionFingerprintMismatchError,
  SessionIdError,
  SessionLogsNotFoundError,
  SessionReportValidationError,
  assertSeasonId,
  assertSessionId,
  isSeasonId,
  isSessionId,
} from '@skyreach/core';
import {
  DirtyGitError,
  FinalizedLogJsonParseError,
  FinalizedLogsNotFoundError,
} from '@skyreach/data';

import {
  AlreadyAppliedError,
  CliError,
  CliValidationError,
  NoChangesError,
} from '../lib/errors';
import { printApplyTrailsResult } from '../lib/printers';
import { resolveApTarget, resolveTrailsTarget } from '../lib/resolvers';

import { applyAp } from './apply-ap';
import { applyTrails } from './apply-trails';

export type ApplyArgs = {
  target?: string;
  allowDirty?: boolean;
  mode?: ApplyMode;
};

export type ApplyMode = 'all' | 'ap' | 'trails';

export const exitCodeForApply = makeExitMapper(
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


export async function apply(args: ApplyArgs) {
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
          const result = await applyTrails({ allowDirty, file: item.file });
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

    if (mode === 'all' || mode === 'ap') {
      const targets =
        targetType === 'session' ? [{ kind: 'session', sessionId: target! }] : resolveApTarget(undefined);

      let applied = 0;
      let skipped = 0;

      for (const item of targets) {
        try {
          const result = await applyAp({ sessionId: item.sessionId, allowDirty });
          if (result.alreadyApplied) {
            console.log(`✅ ${result.sessionId} was already applied (no changes made).`);
            skipped++;
          } else {
            console.log(`✨ Applied ${result.sessionId}:`);
            console.log(`  • ${result.entriesAppended} ledger entr${result.entriesAppended === 1 ? 'y' : 'ies'} appended`);
            console.log(`  • Report: ${result.reportPath}`);
            applied++;
          }
        } catch (e) {
          // Treat "already applied" as benign if applyAp throws that instead of returning a flag
          if (e instanceof SessionIdError) throw e; // real misuse
          // let other hard errors bubble to your exit mapper
          throw e;
        }
      }

      if (targets.length > 1) {
        console.log(`AP reports: applied ${applied}, skipped ${skipped}.`);
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    error(message);
    process.exit(exitCodeForApply(e));
  }
}

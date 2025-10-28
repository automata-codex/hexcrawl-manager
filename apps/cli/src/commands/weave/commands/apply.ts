import { error, info, makeExitMapper } from '@skyreach/cli-kit';
import {
  SessionAlreadyAppliedError,
  SessionFingerprintMismatchError,
  SessionLogsNotFoundError,
  SessionReportValidationError,
  assertSeasonId,
  isSeasonId,
} from '@skyreach/core';
import {
  DirtyGitError,
  FinalizedLogJsonParseError,
  FinalizedLogsNotFoundError,
  HexFileNotFoundError,
  REPO_PATHS,
  discoverFinalizedLogs,
  discoverFinalizedLogsFor,
  loadMeta,
  saveMeta,
} from '@skyreach/data';
import {
  SessionId,
  SessionIdError,
  assertSessionId,
  isSessionId,
  makeSessionId,
} from '@skyreach/schemas';

import {
  AlreadyAppliedError,
  CliError,
  CliValidationError,
  NoChangesError,
} from '../lib/errors';
import { loadFinalizedEventsForSessions } from '../lib/files';
import {
  printApplyHexesSummary,
  printApplyTrailsResult,
} from '../lib/printers';
import { resolveApTarget, resolveTrailsTarget } from '../lib/resolvers';
import { writeFootprint } from '../lib/state';

import { applyAp } from './apply-ap';
import { applyHexes, ApplyHexesRow } from './apply-hexes';
import { applyTrails } from './apply-trails';

export type ApplyArgs = {
  target?: string;
  allowDirty?: boolean;
  mode?: ApplyMode;
};

export type ApplyMode = 'all' | 'ap' | 'hexes' | 'trails';

// Exit codes for `weave apply` command:
// 0 = Success
// 1 = Generic or uncategorized error
// 2 = Invalid/corrupt input
// 3 = Logs/data not found
// 4 = Conflicting or invalid state
// 5 = External failure (e.g., no changes to apply, dirty git state, etc.)
export const exitCodeForApply = makeExitMapper(
  [
    [CliValidationError, 4], // user input or file contents are invalid
    [DirtyGitError, 5], // external failure
    [FinalizedLogJsonParseError, 2], // invalid/corrupt input
    [FinalizedLogsNotFoundError, 3], // not found
    [HexFileNotFoundError, 3], // not found
    [NoChangesError, 5], // no-op error
    [SessionAlreadyAppliedError, 0], // benign no-op
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
    let target: SessionId | string | undefined = undefined;
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
            info(e.message); // benign: continue
            skipped++;
            continue;
          }
          if (e instanceof NoChangesError) {
            info(e.message); // benign: continue
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
        targetType === 'session'
          ? [{ kind: 'session', sessionId: target as SessionId }]
          : resolveApTarget(undefined);

      let applied = 0;
      let skipped = 0;

      for (const item of targets) {
        try {
          const result = await applyAp({
            sessionId: item.sessionId,
            allowDirty,
          });
          if (result.alreadyApplied) {
            console.log(
              `✅ ${result.sessionId} was already applied (no changes made).`,
            );
            skipped++;
          } else {
            console.log(`✨ Applied ${result.sessionId}:`);
            console.log(
              `  • ${result.entriesAppended} ledger entr${result.entriesAppended === 1 ? 'y' : 'ies'} appended`,
            );
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

    if (mode === 'all' || mode === 'hexes') {
      // Load meta to check which sessions have already been applied
      const meta = loadMeta();
      const appliedSessions = meta.state.hexes?.applied?.sessions || [];

      // Decide the sessions in scope:
      // - If user targeted a specific session, just that one (re-apply if needed)
      // - Otherwise process only unapplied finalized sessions
      let sessionIds: SessionId[];
      if (targetType === 'session') {
        sessionIds = [target as SessionId];
      } else {
        // Get all finalized sessions and filter out already-applied ones
        const allSessionIds = Array.from(
          new Set(
            discoverFinalizedLogs().map((log) =>
              makeSessionId(log.sessionNumber),
            ),
          ),
        ).sort();

        sessionIds = allSessionIds.filter((sessionId) => {
          const sessionFiles = discoverFinalizedLogsFor(sessionId);
          const firstFile = sessionFiles[0];
          return !appliedSessions.includes(firstFile.filename);
        });
      }

      // Process each session individually to enable per-session footprints
      let totalChanged = 0;
      let totalScanned = 0;
      const allRows: ApplyHexesRow[] = [];
      const newlyAppliedSessions: string[] = [];

      for (const sessionId of sessionIds) {
        // Load events for this session only
        const events = loadFinalizedEventsForSessions([sessionId]).filter(
          (event) =>
            event.kind === 'move' ||
            event.kind === 'scout' ||
            event.kind === 'explore',
        );

        if (events.length === 0) {
          continue; // Skip sessions with no hex events
        }

        const dryRun = false;
        const { changed, rows, scanned } = await applyHexes({
          dryRun,
          events,
          captureDiffs: dryRun,
        });

        totalChanged += changed;
        totalScanned += scanned;
        allRows.push(...rows);

        // Write footprint for this session's hex changes
        if (changed > 0 || scanned > 0) {
          const sessionFiles = discoverFinalizedLogsFor(sessionId);
          const firstFile = sessionFiles[0]; // Use first file for multi-part sessions

          // Build before/after for changed hexes
          const before: Record<string, any> = {};
          const after: Record<string, any> = {};
          for (const row of rows.filter((r) => r.changed)) {
            before[row.hex] = row.already;
            after[row.hex] = {
              scouted: row.flips.scouted ? true : row.already.scouted,
              visited: row.flips.visited ? true : row.already.visited,
              explored: row.flips.explored ? true : row.already.explored,
              landmarkKnown: row.flips.landmarkKnown
                ? true
                : row.already.landmarkKnown,
            };
          }

          const footprint = {
            id: firstFile.filename.replace(/\.jsonl$/, ''),
            kind: 'session',
            domain: 'hexes',
            sessionId,
            appliedAt: new Date().toISOString(),
            inputs: { sourceFile: firstFile.fullPath },
            effects: {
              hexes: {
                changed,
                scanned,
                hexesModified: rows.filter((r) => r.changed).map((r) => r.hex),
              },
            },
            touched: { before, after },
          };

          writeFootprint(footprint, 'hexes');

          // Track this session as applied
          newlyAppliedSessions.push(firstFile.filename);
        }
      }

      // Update meta with newly applied sessions
      if (newlyAppliedSessions.length > 0) {
        if (!meta.state.hexes) {
          meta.state.hexes = {
            backend: 'meta',
            applied: { sessions: [] },
          };
        }
        if (!meta.state.hexes.applied) {
          meta.state.hexes.applied = { sessions: [] };
        }
        if (!meta.state.hexes.applied.sessions) {
          meta.state.hexes.applied.sessions = [];
        }

        meta.state.hexes.applied.sessions.push(...newlyAppliedSessions);
        saveMeta(meta);
      }

      printApplyHexesSummary(allRows, {
        dryRun: false,
        changed: totalChanged,
        scanned: totalScanned,
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    error(message);
    process.exit(exitCodeForApply(e));
  }
}

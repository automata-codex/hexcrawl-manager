import { loadHavens, loadMeta, loadTrails } from '@skyreach/data';
import path from 'path';

import { readEvents } from '../../../services/event-log.service';
import { applyRolloverToTrails } from '../lib/apply';
import {
  AlreadyAppliedError,
  ChronologyValidationError,
  CliValidationError,
} from '../lib/errors';
import { assertCleanGitOrAllowDirty, resolveInputFile } from '../lib/files';
import {
  isRolloverAlreadyApplied,
  isRolloverChronologyValid,
  isRolloverFile,
  isSessionFile,
} from '../lib/guards';
import { normalizeSeasonId } from '../lib/season';
import { appendToMetaAppliedSessions } from '../lib/state';

export interface ApplyTrailsDebug {
  /** Before/after snapshots for touched edges (subset, not whole file). */
  touched?: {
    before: Record<string, unknown | undefined>;
    after: Record<string, unknown | undefined>;
  };

  /** Raw effect payloads returned by the lib helpers. */
  effects?: unknown; // { session: ... } or { rollover: ... } in legacy

  /** The full path that was resolved/used. */
  sourceFile?: string;

  /** Footprint id that would be written (e.g., `S-<fileId>` or `ROLL-<season>`). */
  footprintId?: string;
}

export type ApplyTrailsKind = 'session' | 'rollover';

export type ApplyTrailsMode = 'auto' | 'rollover' | 'session';

export interface ApplyTrailsOptions {
  /**
   * Optional explicit file path. If omitted, caller’s resolver should pick the
   * next applicable file (mirrors `resolveInputFile` behavior).
   */
  file?: string;

  /** Force one branch of logic (otherwise detect from file). */
  mode?: ApplyTrailsMode;

  /** Don’t write trails/meta/footprint; still compute effects. */
  dryRun?: boolean;

  /** Allow running with dirty git state (parity with legacy guard). */
  allowDirty?: boolean;

  /** Emit richer change details in `debug` field (costly to build). */
  verbose?: boolean;
}

export interface ApplyTrailsResult {
  /** Derived from file and guards. */
  kind?: ApplyTrailsKind;
  seasonId?: string;         // normalized (first season for sessions)
  fileId?: string;           // basename of the applied file

  /** High-level outcome & coarse stats for CLI printing. */
  status: ApplyTrailsStatus;
  summary?: ApplyTrailsSummary;

  /** Include when status !== 'ok' for caller’s messaging. */
  message?: string;

  /** Optional rich details (behind `verbose`). */
  debug?: ApplyTrailsDebug;
}

export type ApplyTrailsStatus =
  | 'ok'                 // wrote changes (or would have in dryRun)
  | 'already-applied'    // idempotency guard tripped
  | 'no-op'              // valid input but nothing to change
  | 'validation-error'   // schema/chronology/semantic checks failed
  | 'unrecognized-file'  // neither session nor rollover
  | 'io-error';          // write failed (not thrown if you prefer status)

export interface ApplyTrailsSummary {
  // Session apply deltas
  created?: number;          // effects.created.length
  rediscovered?: number;     // effects.rediscovered.length
  usesFlagged?: number;      // Object.keys(effects.usedFlags).length

  // Rollover deltas
  maintained?: number;       // effects.maintained.length
  persisted?: number;        // effects.persisted.length
  deletedTrails?: number;    // effects.deletedTrails.length

  // Aggregate/touch metrics (both paths)
  edgesTouched?: number;     // unique keys in before/after set
}

export async function applyTrails(
  opts: ApplyTrailsOptions,
): Promise<ApplyTrailsResult> {
  assertCleanGitOrAllowDirty(opts);

  const trails = loadTrails();
  const meta = loadMeta();
  const havens = loadHavens();

  let file;
  const resolved = await resolveInputFile(opts.file, meta);
  switch (resolved.status) {
    case 'ok':
      file = resolved.file!;
      break;
    case 'none-found':
      return { status: 'no-op', message: 'No unapplied session or rollover files found.' };
    case 'cancelled':
      return { status: 'no-op', message: 'File selection cancelled by user.' };
    case 'no-prompt-no-arg':
      return { status: 'validation-error', message: 'No file specified and --no-prompt is set.' };
  }

  if (isRolloverFile(file)) {
    // --- Validate rollover file ---
    const events = readEvents(file);
    const rollover = events.find((e) => e.kind === 'season_rollover');
    if (!rollover || !rollover.payload?.seasonId) {
      throw new CliValidationError(
        'Rollover file missing season_rollover event or seasonId.',
      );
    }
    const seasonId = normalizeSeasonId(rollover.payload.seasonId as string);
    const fileId = path.basename(file);
    if (isRolloverAlreadyApplied(meta, fileId)) {
      throw new AlreadyAppliedError('Rollover already applied.');
    }
    const chrono = isRolloverChronologyValid(meta, seasonId);
    if (!chrono.valid) {
      throw new ChronologyValidationError(
        `Rollover is not for the next unapplied season. Expected: ${chrono.expected}`,
      );
    }

    // --- Rollover apply logic ---
    // Build set of affected edges
    const { trails: trailsAfter, ...effects } = applyRolloverToTrails(
      trails,
      havens,
      false,
    );
    const affectedEdges = new Set([
      ...effects.maintained,
      ...effects.persisted,
      ...effects.deletedTrails,
    ]);

    // Build before/after for only affected edges
    const before: Record<string, any> = {};
    const after: Record<string, any> = {};
    for (const edge of affectedEdges) {
      before[edge] = trails[edge] ? { ...trails[edge] } : undefined;
      after[edge] = trailsAfter[edge] ? { ...trailsAfter[edge] } : undefined;
    }

    // Update meta
    if (!meta.rolledSeasons) {
      meta.rolledSeasons = [];
    }
    meta.rolledSeasons.push(seasonId);
    appendToMetaAppliedSessions(meta, fileId);

  } else if (isSessionFile(file)) {
  } else {
  }
}

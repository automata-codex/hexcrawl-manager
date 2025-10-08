import {
  deriveSeasonId,
  getRolloverSeasonId,
  normalizeSeasonId,
} from '@skyreach/core';
import {
  loadHavens,
  loadMeta,
  loadTrails,
  saveMeta,
  saveTrails,
} from '@skyreach/data';
import path from 'path';

import { readEvents } from '../../../services/event-log.service';
import { applyRolloverToTrails, applySessionToTrails } from '../lib/apply';
import {
  AlreadyAppliedError,
  ChronologyValidationError,
  CliValidationError,
  IoApplyError,
  NoChangesError,
} from '../lib/errors';
import {
  assertCleanGitOrAllowDirty,
  getMostRecentRolloverFootprint,
  resolveInputFile,
} from '../lib/files';
import {
  isRolloverAlreadyApplied,
  isRolloverChronologyValid,
  isRolloverFile,
  isSessionAlreadyApplied,
  isSessionChronologyValid,
  isSessionFile,
} from '../lib/guards';
import { appendToMetaAppliedSessions, writeFootprint } from '../lib/state';
import { validateSessionEnvelope } from '../lib/validate';

import type { CampaignDate } from '@skyreach/schemas';

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
  seasonId?: string; // normalized (first season for sessions)
  fileId?: string; // basename of the applied file

  /** High-level outcome & coarse stats for CLI printing. */
  status: ApplyTrailsStatus;
  summary?: ApplyTrailsSummary;

  /** Include when status !== 'ok' for caller’s messaging. */
  message?: string;

  /** Optional rich details (behind `verbose`). */
  debug?: ApplyTrailsDebug;
}

export type ApplyTrailsStatus =
  | 'ok' // wrote changes (or would have in dryRun)
  | 'already-applied' // idempotency guard tripped
  | 'no-op' // valid input but nothing to change
  | 'validation-error' // schema/chronology/semantic checks failed
  | 'unrecognized-file' // neither session nor rollover
  | 'io-error'; // write failed (not thrown if you prefer status)

export interface ApplyTrailsSummary {
  // Session apply deltas
  created?: number; // effects.created.length
  rediscovered?: number; // effects.rediscovered.length
  usesFlagged?: number; // Object.keys(effects.usedFlags).length

  // Rollover deltas
  maintained?: number; // effects.maintained.length
  persisted?: number; // effects.persisted.length
  deletedTrails?: number; // effects.deletedTrails.length

  // Aggregate/touch metrics (both paths)
  edgesTouched?: number; // unique keys in before/after set
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
      return {
        status: 'no-op',
        message: 'No unapplied session or rollover files found.',
      };
    case 'cancelled':
      return { status: 'no-op', message: 'File selection cancelled by user.' };
    case 'no-prompt-no-arg':
      return {
        status: 'validation-error',
        message: 'No file specified and --no-prompt is set.',
      };
  }

  if (isRolloverFile(file)) {
    // --- Validate rollover file ---
    const events = readEvents(file);
    const rollover = events.find((e) => e.kind === 'season_rollover');
    const seasonId = rollover ? getRolloverSeasonId(rollover) : undefined;
    if (!seasonId) {
      throw new CliValidationError('Rollover file missing payload.seasonId.');
    }
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

    // --- Update files ---
    const footprint = {
      id: `ROLL-${seasonId}`,
      kind: 'rollover' as const,
      seasonId,
      appliedAt: new Date().toISOString(),
      inputs: { sourceFile: file },
      effects: { rollover: effects },
      touched: { before, after },
    };
    try {
      saveTrails(trailsAfter);
      saveMeta(meta);
      writeFootprint(footprint);

      // Hand result back to the CLI shell for printing/exit code
      return {
        status: 'ok' as const,
        kind: 'rollover' as const,
        seasonId,
        fileId: path.basename(file),
        summary: {
          maintained: effects.maintained.length,
          persisted: effects.persisted.length,
          deletedTrails: effects.deletedTrails.length,
          edgesTouched: Object.keys({ ...before, ...after }).length,
        },
        debug: { footprintId: footprint.id },
      };
    } catch (e) {
      throw new IoApplyError('I/O error during apply: ' + e);
    }
  } else if (isSessionFile(file)) {
    // --- Validate session file ---
    const events = readEvents(file);
    const validation = validateSessionEnvelope(events);
    if (!validation.isValid) {
      throw new CliValidationError(
        `Session envelope validation failed: ${validation.error}`,
      );
    }
    if (events.length === 0) {
      throw new CliValidationError('Session file is empty or unreadable.');
    }
    const dayStarts = events.filter((e) => e.kind === 'day_start');
    if (dayStarts.length === 0) {
      throw new CliValidationError('No day_start event in session.');
    }

    const seasonIds = dayStarts.map((e) => {
      const calDate = e.payload?.calendarDate as CampaignDate;
      return deriveSeasonId(calDate);
    });
    const firstSeasonId = normalizeSeasonId(seasonIds[0]);

    // Ensure all events are in the same (normalized) season
    const multiSeason = !seasonIds.every(
      (sid) => normalizeSeasonId(sid) === firstSeasonId,
    );
    if (multiSeason) {
      throw new CliValidationError(
        'Multi-season session detected. All events must share the same season.',
      );
    }

    // Ensure required rollovers have been applied
    const chrono = isSessionChronologyValid(meta, firstSeasonId);
    if (!chrono.valid) {
      throw new ChronologyValidationError(
        `Missing required rollover(s) for season ${firstSeasonId}: ${chrono.missing.join(', ')}`,
      );
    }
    const fileId = path.basename(file);
    if (isSessionAlreadyApplied(meta, fileId)) {
      throw new AlreadyAppliedError('Session already applied.');
    }

    // --- Session apply logic ---
    const mostRecentRoll = getMostRecentRolloverFootprint(firstSeasonId);
    const deletedTrails =
      mostRecentRoll?.effects?.rollover?.deletedTrails || [];
    const { effects, before, after } = applySessionToTrails(
      events,
      trails,
      firstSeasonId,
      deletedTrails,
      false,
    );
    const changed =
      effects.created.length > 0 ||
      effects.rediscovered.length > 0 ||
      Object.keys(effects.usedFlags).length > 0;
    if (!changed) {
      throw new NoChangesError();
    }

    // --- Update files ---
    try {
      saveTrails(trails);
      appendToMetaAppliedSessions(meta, fileId);
      saveMeta(meta);

      // Write footprint
      const footprint = {
        id: `${fileId.replace(/\..*$/, '')}`,
        kind: 'session',
        seasonId: firstSeasonId,
        appliedAt: new Date().toISOString(),
        inputs: { sourceFile: file },
        effects: { session: effects },
        touched: { before, after },
      };
      writeFootprint(footprint);

      return {
        status: 'ok' as const,
        kind: 'session' as const,
        seasonId: firstSeasonId,
        fileId,
        summary: {
          created: effects.created.length,
          rediscovered: effects.rediscovered.length,
          usesFlagged: Object.keys(effects.usedFlags).length,
          edgesTouched: Object.keys({ ...before, ...after }).length,
        },
        debug: { footprintId: footprint.id },
      };
    } catch (e) {
      throw new IoApplyError('I/O error during apply: ' + e);
    }
  } else {
    throw new CliValidationError(`Unrecognized file type for apply: ${file}`);
  }
}

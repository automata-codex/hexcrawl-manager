import {
  compareSeasonIds,
  deriveSeasonId,
  getRolloverSeasonId,
  normalizeSeasonId,
} from '@skyreach/core';
import {
  isRolloverPath,
  loadHavens,
  loadMeta,
  loadTrails,
  parseSessionFilename,
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
} from '../lib/errors';
import {
  getLastAppliedSessionSeason,
  getMostRecentRolloverFootprint,
  resolveInputFile,
} from '../lib/files';
import {
  isRolloverAlreadyApplied,
  isRolloverChronologyValid,
  isSessionAlreadyApplied,
  isSessionChronologyValid,
  isSessionFile,
} from '../lib/guards';
import { appendToMetaAppliedSessions, writeFootprint } from '../lib/state';
import { ApplyTrailsResult } from '../lib/types';
import { validateSessionEnvelope } from '../lib/validate';

import type { CampaignDate } from '@skyreach/schemas';

export type ApplyTrailsMode = 'auto' | 'rollover' | 'session';

export interface ApplyTrailsOptions {
  /**
   * Optional explicit file path. If omitted, caller’s resolver should pick the
   * next applicable file (mirrors `resolveInputFile` behavior).
   */
  file?: string;

  /** Force one branch of logic (otherwise detect from file). */
  mode?: ApplyTrailsMode;

  /** Don't write trails/meta/footprint; still compute effects. */
  dryRun?: boolean;

  /** Emit richer change details in `debug` field (costly to build). */
  verbose?: boolean;
}

export async function applyTrails(
  opts: ApplyTrailsOptions,
): Promise<ApplyTrailsResult> {
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

  if (isRolloverPath(file)) {
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
    if (!meta.state.trails.applied?.seasons) {
      const applied = meta.state.trails.applied || {};
      applied.seasons = [];
      meta.state.trails.applied = applied;
    }
    meta.state.trails.applied?.seasons.push(seasonId);
    appendToMetaAppliedSessions(meta, fileId);

    // --- Update files ---
    const footprint = {
      id: `ROLL-${seasonId}`,
      kind: 'rollover' as const,
      seasonId,
      appliedAt: new Date().toISOString(),
      inputs: { sourceFile: file },
      effects: { rollover: { trails: trailsAfter, ...effects } },
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

    // Extract stem date from filename
    const sessionFileInfo = parseSessionFilename(path.basename(file));
    if (!sessionFileInfo) {
      throw new CliValidationError(
        'Session filename must include a valid date (e.g. session-0027_2025-10-15.json).',
      );
    }

    const validation = validateSessionEnvelope(events, sessionFileInfo.date);
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

    // --- Detect inter-session season change ---
    // If the season changed between the last applied session and this one,
    // we need to apply rollover logic (trail decay) BEFORE chronology checks
    const lastSessionSeason = getLastAppliedSessionSeason();
    let autoRolloverEffects: any = null;

    if (
      lastSessionSeason &&
      compareSeasonIds(firstSeasonId, lastSessionSeason) > 0
    ) {
      // Season has advanced - apply trail decay for the new season
      const rolloverResult = applyRolloverToTrails(trails, havens, false);

      // Record this automatic rollover in meta
      if (!meta.state.trails.applied?.seasons) {
        const applied = meta.state.trails.applied || {};
        applied.seasons = [];
        meta.state.trails.applied = applied;
      }
      meta.state.trails.applied?.seasons.push(firstSeasonId);

      // Build footprint for the auto rollover
      const affectedEdges = new Set([
        ...rolloverResult.maintained,
        ...rolloverResult.persisted,
        ...rolloverResult.deletedTrails,
      ]);
      const rolloverBefore: Record<string, any> = {};
      const rolloverAfter: Record<string, any> = {};
      for (const edge of affectedEdges) {
        rolloverBefore[edge] = trails[edge] ? { ...trails[edge] } : undefined;
        rolloverAfter[edge] = rolloverResult.trails[edge]
          ? { ...rolloverResult.trails[edge] }
          : undefined;
      }

      const autoRolloverFootprint = {
        id: `ROLL-${firstSeasonId}`,
        kind: 'rollover' as const,
        seasonId: firstSeasonId,
        appliedAt: new Date().toISOString(),
        inputs: {
          sourceFile: file,
          note: 'Automatic rollover applied due to inter-session season change',
        },
        effects: { rollover: rolloverResult },
        touched: { before: rolloverBefore, after: rolloverAfter },
      };

      // Update trails to the rolled-over state
      Object.assign(trails, rolloverResult.trails);

      // Save meta BEFORE chronology check so the rolled season is recorded
      saveMeta(meta);

      // Save the auto-rollover footprint and store effects for reporting
      writeFootprint(autoRolloverFootprint);
      autoRolloverEffects = {
        seasonId: firstSeasonId,
        maintained: rolloverResult.maintained.length,
        persisted: rolloverResult.persisted.length,
        deletedTrails: rolloverResult.deletedTrails.length,
      };
    }

    // Ensure required rollovers have been applied (after auto-rollover)
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

    // --- Update files ---
    try {
      // Even if no changes, mark session as applied to prevent re-processing
      appendToMetaAppliedSessions(meta, fileId);
      saveMeta(meta);

      if (!changed) {
        // No trail changes, but still mark as applied
        return {
          status: 'no-op' as const,
          kind: 'session' as const,
          seasonId: firstSeasonId,
          fileId,
          message: `No changes for ${fileId}`,
          autoRollover: autoRolloverEffects,
        };
      }

      // Has changes - save trails and write footprint
      saveTrails(trails);

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
        autoRollover: autoRolloverEffects,
      };
    } catch (e) {
      throw new IoApplyError('I/O error during apply: ' + e);
    }
  } else {
    throw new CliValidationError(`Unrecognized file type for apply: ${file}`);
  }
}

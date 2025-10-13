import { deriveSeasonId, normalizeSeasonId } from '@skyreach/core';
import {
  DataValidationError,
  isRolloverPath,
  loadHavens,
  loadMeta,
  loadTrails,
} from '@skyreach/data';
import path from 'path';

import { eventsOf, readEvents } from '../../../services/event-log.service';
import {
  applyRolloverToTrails,
  applySessionToTrails,
} from '../lib/apply';
import { ChronologyValidationError } from '../lib/errors';
import {
  assertCleanGitOrAllowDirty,
  getMostRecentRolloverFootprint,
} from '../lib/files';
import {
  isRolloverAlreadyApplied,
  isRolloverChronologyValid,
  isSessionAlreadyApplied,
  isSessionChronologyValid,
  isSessionFile,
} from '../lib/guards';
import { ApplyTrailsResult } from '../lib/types';
import { validateSessionEnvelope } from '../lib/validate';

import type { DayStartEvent, SeasonRolloverEvent } from '@skyreach/schemas';

export interface PlanTrailsOptions {
  allowDirty?: boolean;
  file: string;
}

export async function planTrails(opts: PlanTrailsOptions): Promise<ApplyTrailsResult> {
  assertCleanGitOrAllowDirty(opts);

  const havens = loadHavens();
  const meta = loadMeta();
  const trails = loadTrails();

  const { file } = opts;
  const fileId = path.basename(file);

  if (isRolloverPath(file)) {
    const events = readEvents(file);
    const rollover = events.find((e) => e.kind === 'season_rollover') as SeasonRolloverEvent | undefined;

    if (!rollover || !rollover.payload?.seasonId) {
      throw new DataValidationError(file, { reason: 'missing_season_rollover_or_id' });
    }

    const seasonId = normalizeSeasonId(rollover.payload.seasonId);

    if (isRolloverAlreadyApplied(meta, fileId)) {
      return {
        kind: 'rollover',
        seasonId,
        fileId,
        dryRun: true,
        status: 'already-applied',
        summary: {
          created: 0,
          rediscovered: 0,
          maintained: 0,
          persisted: 0,
        },
      };
    }

    const chrono = isRolloverChronologyValid(meta, seasonId);
    if (!chrono.valid) {
      throw new ChronologyValidationError(
        'Rollover is not for the next unapplied season.',
      );
    }

    const effects = applyRolloverToTrails(trails, havens, true);
    const maintained = effects.maintained ?? [];
    const persisted = effects.persisted ?? [];
    const deletedTrails = effects.deletedTrails ?? [];

    const anyChanges =
      maintained.length > 0 ||
      persisted.length > 0 ||
      deletedTrails.length > 0;

    return {
      kind: 'rollover',
      seasonId,
      fileId,
      dryRun: true,
      status: anyChanges ? 'ok' : 'no-op',
      summary: {
        created: 0,
        rediscovered: 0,
        maintained: maintained.length,
        persisted: persisted.length,
      },
    };
  }

  if (isSessionFile(file)) {
    const events = readEvents(file);
    const validation = validateSessionEnvelope(events);
    if (!validation.isValid) {
      throw new DataValidationError(file, validation.error);
    }

    if (!events || events.length === 0) {
      throw new DataValidationError(file, { reason: 'empty_session_file' });
    }

    if (isSessionAlreadyApplied(meta, fileId)) {
      // We still extract seasonId for a consistent shape.
      const dayStarts = eventsOf(events, 'day_start') as DayStartEvent[];
      const seasonId = dayStarts.length
        ? normalizeSeasonId(
          deriveSeasonId(dayStarts[0].payload.calendarDate),
        )
        : 'unknown';
      return {
        kind: 'session',
        seasonId,
        fileId,
        dryRun: true,
        status: 'already-applied',
        summary: {
          created: 0,
          rediscovered: 0,
          maintained: 0,
          persisted: 0,
        },
      };
    }

    const dayStarts = events.filter((e) => e.kind === 'day_start');
    if (!dayStarts.length) {
      throw new DataValidationError(file, { reason: 'missing_day_start' });
    }

    // Enforce single-season session
    const seasonIds = dayStarts.map((e) =>
      deriveSeasonId(e.payload.calendarDate),
    );
    const firstSeasonId = normalizeSeasonId(seasonIds[0]);

    const allSameSeason = seasonIds.every(
      (sid) => normalizeSeasonId(sid) === firstSeasonId,
    );
    if (!allSameSeason) {
      throw new DataValidationError(file, { reason: 'multi_season_session', seasonIds });
    }

    const chrono = isSessionChronologyValid(meta, firstSeasonId);
    if (!chrono.valid) {
      throw new ChronologyValidationError(
        `Missing required rollover(s) for season ${firstSeasonId}.`,
      );
    }

    const trails = loadTrails();
    const mostRecentRoll = getMostRecentRolloverFootprint(firstSeasonId);
    const deletedTrails =
      (mostRecentRoll?.effects?.rollover?.deletedTrails as string[] | undefined) ||
      [];

    const { effects } = applySessionToTrails(
      events,
      trails,
      firstSeasonId,
      deletedTrails,
      true, // dry run
    );

    const created = effects.created ?? [];
    const usedFlagsCount = Object.keys(effects.usedFlags ?? {}).length;
    const rediscovered = effects.rediscovered ?? [];

    const anyChanges =
      created.length > 0 || usedFlagsCount > 0 || rediscovered.length > 0;

    return {
      kind: 'session',
      seasonId: firstSeasonId,
      fileId,
      dryRun: true,
      status: anyChanges ? 'ok' : 'no-op',
      summary: {
        created: created.length,
        rediscovered: rediscovered.length,
        maintained: 0,
        persisted: 0,
      },
    };
  }

  throw new DataValidationError(file, { reason: 'unrecognized_file_type' });
}

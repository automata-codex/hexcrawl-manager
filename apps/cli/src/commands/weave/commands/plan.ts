import { info, error } from '@skyreach/cli-kit';
import { deriveSeasonId, normalizeSeasonId } from '@skyreach/core';
import { isRolloverPath, loadHavens, loadMeta, loadTrails } from '@skyreach/data';
import path from 'path';

import { readEvents } from '../../../services/event-log.service';
import { applyRolloverToTrails, applySessionToTrails } from '../lib/apply';
import { getMostRecentRolloverFootprint, resolveInputFile } from '../lib/files';
import {
  isRolloverAlreadyApplied,
  isRolloverChronologyValid,
  isSessionAlreadyApplied,
  isSessionChronologyValid,
  isSessionFile,
} from '../lib/guards';
import { validateSessionEnvelope } from '../lib/validate';

import type { ScribeEvent } from '@skyreach/schemas';

export async function plan(fileArg?: string) {
  const meta = loadMeta();

  // Use shared input helper for file selection
  let file;
  const resolved = await resolveInputFile(fileArg, meta);
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

  // File type detection
  if (isRolloverPath(file)) {
    // --- Rollover planning: detect and parse ---
    const events = readEvents(file);
    const rollover = events.find((e) => e.kind === 'season_rollover') as
      | (ScribeEvent & { payload: { seasonId: string } })
      | undefined;
    if (!rollover || !rollover.payload.seasonId) {
      error(
        'Validation error: Rollover file missing season_rollover event or seasonId.',
      );
      process.exit(4);
    }
    const seasonId = normalizeSeasonId(rollover.payload.seasonId);
    info(`Rollover plan for season: ${seasonId}`);

    // Already applied check
    const fileId = path.basename(file);
    if (isRolloverAlreadyApplied(meta, fileId)) {
      info('Rollover already applied.');
      process.exit(3);
    }

    // Chronology check: only allow for next unapplied season
    const chrono = isRolloverChronologyValid(meta, seasonId);
    if (!chrono.valid) {
      error(
        `Validation error: Rollover is not for the next unapplied season. Expected: ${chrono.expected}`,
      );
      process.exit(4);
    }

    // --- Load trails and havens ---
    const havens = loadHavens();
    const trails = loadTrails();

    // Use shared helper for dry-run plan
    const effects = applyRolloverToTrails(trails, havens, true);

    // No-op check: if all lists are empty, exit 5
    if (
      effects.maintained.length === 0 &&
      effects.persisted.length === 0 &&
      effects.deletedTrails.length === 0
    ) {
      info('No changes would be made.');
      process.exit(5);
    }
    info(`Near-haven edges (maintained): ${effects.maintained.length}`);
    info(`Far-haven edges (persisted): ${effects.persisted.length}`);
    info(`Far-haven edges (deleted): ${effects.deletedTrails.length}`);
    info(
      '  Sample maintained: ' + JSON.stringify(effects.maintained.slice(0, 5)),
    );
    info(
      '  Sample persisted: ' + JSON.stringify(effects.persisted.slice(0, 5)),
    );
    info(
      '  Sample deleted: ' + JSON.stringify(effects.deletedTrails.slice(0, 5)),
    );
    process.exit(0);
  } else if (isSessionFile(file)) {
    const events = readEvents(file);
    const validation = validateSessionEnvelope(events);
    if (!validation.isValid) {
      error(`Session envelope validation failed: ${validation.error}`);
      process.exit(4);
    }

    // Already applied check
    const fileId = path.basename(file);
    if (isSessionAlreadyApplied(meta, fileId)) {
      info('Session already applied.');
      process.exit(3);
    }

    // --- Session planning logic ---
    if (!events.length) {
      error('Session file is empty or unreadable.');
      process.exit(4);
    }

    const dayStarts = events.filter((e) => e.kind === 'day_start');
    if (!dayStarts.length) {
      error('Validation error: No day_start event in session.');
      process.exit(4);
    }

    // All day_start events must have the same seasonId
    const seasonIds = dayStarts.map((e) =>
      deriveSeasonId(e.payload.calendarDate as any),
    );
    const firstSeasonId = seasonIds[0];
    if (
      !seasonIds.every(
        (sid) => normalizeSeasonId(sid) === normalizeSeasonId(firstSeasonId),
      )
    ) {
      error(
        'Validation error: Multi-season session detected. All events must share the same season.',
      );
      process.exit(4);
    }

    // Chronology check: all required rollovers must be present
    const chrono = isSessionChronologyValid(meta, firstSeasonId);
    if (!chrono.valid) {
      error(
        `Validation error: Missing required rollover(s) for season ${firstSeasonId}: ${chrono.missing.join(', ')}`,
      );
      process.exit(4);
    }

    // Simulate plan
    const trails = loadTrails();
    const mostRecentRoll = getMostRecentRolloverFootprint(firstSeasonId);
    const deletedTrails =
      mostRecentRoll?.effects?.rollover?.deletedTrails || [];
    const { effects } = applySessionToTrails(
      events,
      trails,
      firstSeasonId,
      deletedTrails,
      true,
    );

    // Output summary
    info('Plan summary:');
    if (effects.created.length) {
      info('  Edges to create: ' + JSON.stringify(effects.created));
    }
    if (Object.keys(effects.usedFlags).length) {
      info(
        '  Edges to set usedThisSeason: ' +
          JSON.stringify(Object.keys(effects.usedFlags)),
      );
    }
    if (effects.rediscovered.length) {
      info('  Rediscovered edges: ' + JSON.stringify(effects.rediscovered));
    }
    if (
      !effects.created.length &&
      !Object.keys(effects.usedFlags).length &&
      !effects.rediscovered.length
    ) {
      info('No changes would be made.');
      process.exit(5);
    }
    process.exit(0);
  } else {
    error('Unrecognized file type for planning.');
    process.exit(4);
  }
}

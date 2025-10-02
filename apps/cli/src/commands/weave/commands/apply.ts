import { error, info } from '@skyreach/cli-kit';
import {
  REPO_PATHS,
  loadMeta,
  readEventLog,
  saveMeta,
  writeYamlAtomic,
} from '@skyreach/data';
import path from 'path';

import { applyRolloverToTrails, applySessionToTrails } from '../lib/apply';
import {
  getMostRecentRolloverFootprint,
  requireCleanGitOrAllowDirty,
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
import { deriveSeasonId, normalizeSeasonId } from '../lib/season';
import {
  appendToMetaAppliedSessions,
  loadHavens,
  loadTrails,
  writeFootprint,
} from '../lib/state';
import { validateSessionEnvelope } from '../lib/validate';

import type { CampaignDate } from '@skyreach/schemas';

export async function apply(fileArg?: string, opts?: any) {
  requireCleanGitOrAllowDirty(opts);

  const trails = loadTrails();
  const meta = loadMeta();
  const havens = loadHavens();

  // Use shared input helper for file selection
  const file = await resolveInputFile(fileArg, meta, opts);
  if (!file) {
    throw new Error('No file specified despite everything you did.');
  }

  // File type detection
  if (isRolloverFile(file)) {
    const events = readEventLog(file);
    const rollover = events.find((e) => e.kind === 'season_rollover');
    if (!rollover || !rollover.payload?.seasonId) {
      error(
        'Validation error: Rollover file missing season_rollover event or seasonId.',
      );
      process.exit(4);
    }
    const seasonId = normalizeSeasonId(rollover.payload.seasonId as string);
    const fileId = path.basename(file);
    if (isRolloverAlreadyApplied(meta, fileId)) {
      info('Rollover already applied.');
      process.exit(3);
    }
    const chrono = isRolloverChronologyValid(meta, seasonId);
    if (!chrono.valid) {
      error(
        `Validation error: Rollover is not for the next unapplied season. Expected: ${chrono.expected}`,
      );
      process.exit(4);
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
    // Write trails.yml and meta.yaml
    try {
      writeYamlAtomic(REPO_PATHS.TRAILS(), trailsAfter);
      saveMeta(meta);
      // Write footprint
      const footprint = {
        id: `ROLL-${seasonId}`,
        kind: 'rollover',
        seasonId,
        appliedAt: new Date().toISOString(),
        inputs: { sourceFile: file },
        effects: { rollover: effects },
        touched: { before, after },
      };
      writeFootprint(footprint);
      info('Rollover applied.');
      process.exit(0);
    } catch (e) {
      error('I/O error during apply: ' + e);
      process.exit(6);
    }
  } else if (isSessionFile(file)) {
    const events = readEventLog(file);
    const validation = validateSessionEnvelope(events);
    if (!validation.isValid) {
      error(`Session envelope validation failed: ${validation.error}`);
      process.exit(4);
    }
    if (!events.length) {
      error('Session file is empty or unreadable.');
      process.exit(4);
    }
    const dayStarts = events.filter((e) => e.kind === 'day_start');
    if (!dayStarts.length) {
      error('Validation error: No day_start event in session.');
      process.exit(4);
    }
    const seasonIds = dayStarts.map((e) => {
      const calDate = e.payload?.calendarDate as CampaignDate;
      return deriveSeasonId(calDate);
    });
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
    const chrono = isSessionChronologyValid(meta, firstSeasonId);
    if (!chrono.valid) {
      error(
        `Validation error: Missing required rollover(s) for season ${firstSeasonId}: ${chrono.missing.join(', ')}`,
      );
      process.exit(4);
    }
    const fileId = path.basename(file);
    if (isSessionAlreadyApplied(meta, fileId)) {
      info('Session already applied.');
      process.exit(3);
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
      info('No changes would be made.');
      process.exit(5);
    }
    // Write trails.yml
    try {
      writeYamlAtomic(REPO_PATHS.TRAILS(), trails);
      appendToMetaAppliedSessions(meta, fileId);
      saveMeta(meta);

      // Write footprint
      const footprint = {
        id: `S-${fileId.replace(/\..*$/, '')}`,
        kind: 'session',
        seasonId: firstSeasonId,
        appliedAt: new Date().toISOString(),
        inputs: { sourceFile: file },
        effects: { session: effects },
        touched: { before, after },
      };
      writeFootprint(footprint);
      info('Session applied.');
      process.exit(0);
    } catch (e) {
      error('I/O error during apply: ' + e);
      process.exit(6);
    }
  } else {
    error(`Unrecognized file type for apply: ${file}`);
    process.exit(4);
  }
}

import path from 'path';
import {
  applyRolloverToTrails,
  canonicalEdgeKey,
  getMostRecentRolloverFootprint,
  isRolloverFile,
  isSessionAlreadyApplied,
  isSessionChronologyValid,
  isSessionFile,
  loadHavens,
  loadMeta,
  loadTrails,
  resolveInputFile,
} from '../lib/input';
import { deriveSeasonId, normalizeSeasonId } from '../lib/season';
import { readJsonl } from '../../scribe/lib/jsonl';
import { info, error } from '../../scribe/lib/report';
import type { Event } from '../../scribe/types';

export async function plan(fileArg?: string) {
  const meta = loadMeta();

  // Use shared input helper for file selection
  const file = await resolveInputFile(fileArg, meta);
  if (!file) {
    throw new Error('No file specified despite everything you did.');
  }

  // File type detection
  if (isRolloverFile(file)) {
    // --- Rollover planning: detect and parse ---
    const events = readJsonl(file);
    const rollover = events.find(e => e.kind === 'season_rollover') as Event & { payload: { seasonId: string } } | undefined;
    if (!rollover || !rollover.payload.seasonId) {
      error('Validation error: Rollover file missing season_rollover event or seasonId.');
      process.exit(4);
    }
    const seasonId = normalizeSeasonId(rollover.payload.seasonId);
    info(`Rollover plan for season: ${seasonId}`);

    // Already applied check
    const fileId = path.basename(file);
    if (meta.appliedSessions?.includes(fileId)) {
      info('Rollover already applied.');
      process.exit(3);
    }

    // --- Load trails and havens ---
    const havens = loadHavens();
    const trails = loadTrails();

    // Use shared helper for dry-run plan
    const effects = applyRolloverToTrails(trails, havens, true);

    // No-op check: if all lists are empty, exit 5
    if (effects.maintained.length === 0 && effects.persisted.length === 0 && effects.deletedTrails.length === 0) {
      info('No changes would be made.');
      process.exit(5);
    }
    info(`Near-haven edges (maintained): ${effects.maintained.length}`);
    info(`Far-haven edges (persisted): ${effects.persisted.length}`);
    info(`Far-haven edges (deleted): ${effects.deletedTrails.length}`);
    info('  Sample maintained: ' + JSON.stringify(effects.maintained.slice(0, 5)));
    info('  Sample persisted: ' + JSON.stringify(effects.persisted.slice(0, 5)));
    info('  Sample deleted: ' + JSON.stringify(effects.deletedTrails.slice(0, 5)));
    process.exit(0);
  } else if (isSessionFile(file)) {
    // --- Session planning logic ---
    const events = readJsonl(file);
    if (!events.length) {
      error('Session file is empty or unreadable.');
      process.exit(4);
    }

    const dayStarts = events.filter(e => e.kind === 'day_start');
    if (!dayStarts.length) {
      error('Validation error: No day_start event in session.');
      process.exit(4);
    }

    // All day_start events must have the same seasonId
    const seasonIds = dayStarts.map(e => deriveSeasonId(e.payload.calendarDate as any));
    const firstSeasonId = seasonIds[0];
    if (!seasonIds.every(sid => normalizeSeasonId(sid) === normalizeSeasonId(firstSeasonId))) {
      error('Validation error: Multi-season session detected. All events must share the same season.');
      process.exit(4);
    }

    // Chronology check: all required rollovers must be present
    const chrono = isSessionChronologyValid(meta, firstSeasonId);
    if (!chrono.valid) {
      error(`Validation error: Missing required rollover(s) for season ${firstSeasonId}: ${chrono.missing.join(', ')}`);
      process.exit(4);
    }
    // Already applied check
    const fileId = path.basename(file);
    if (isSessionAlreadyApplied(meta, fileId)) {
      info('Session already applied.');
      process.exit(3);
    }

    // Simulate plan
    const trails = loadTrails();
    const mostRecentRoll = getMostRecentRolloverFootprint(firstSeasonId);
    const deletedTrails = mostRecentRoll?.effects?.rollover?.deletedTrails || [];
    const created: string[] = [];
    const usedFlags: Record<string, boolean> = {};
    const rediscovered: string[] = [];
    let currentHex: string | null = null;
    // Find session_start
    const sessionStart = events.find(e => e.kind === 'session_start');
    if (sessionStart && sessionStart.payload.startHex) {
      currentHex = sessionStart.payload.startHex as string;
    }
    for (const e of events) {
      if (e.kind === 'trail' && e.payload.marked) {
        const edge = canonicalEdgeKey(e.payload.from as string, e.payload.to as string);
        created.push(edge);
        usedFlags[edge] = true;
      }
      if (e.kind === 'move') {
        let from = e.payload.from as string | null;
        let to = e.payload.to as string;
        if (!from && currentHex) from = currentHex;
        if (!from || !to) continue; // skip invalid
        const edge = canonicalEdgeKey(from, to);
        currentHex = to;
        if (trails[edge]) {
          usedFlags[edge] = true;
        } else if (deletedTrails.includes(edge)) {
          rediscovered.push(edge);
          usedFlags[edge] = true;
        }
      }
    }
    // Output summary
    info('Plan summary:');
    if (created.length) {
      info('  Edges to create: ' + JSON.stringify(created));
    }
    if (Object.keys(usedFlags).length) {
      info('  Edges to set usedThisSeason: ' + JSON.stringify(Object.keys(usedFlags)));
    }
    if (rediscovered.length) {
      info('  Rediscovered edges: ' + JSON.stringify(rediscovered));
    }
    if (!created.length && !Object.keys(usedFlags).length && !rediscovered.length) {
      info('No changes would be made.');
      process.exit(5);
    }
    process.exit(0);
  } else {
    error('Unrecognized file type for planning.');
    process.exit(4);
  }
}

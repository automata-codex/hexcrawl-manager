import path from 'path';
import {
  appendToMetaAppliedSessions,
  applyRolloverToTrails,
  canonicalEdgeKey,
  getMostRecentRolloverFootprint,
  isRolloverAlreadyApplied,
  isRolloverChronologyValid,
  isRolloverFile,
  isSessionAlreadyApplied,
  isSessionChronologyValid,
  isSessionFile,
  loadHavens,
  loadMeta,
  loadTrails,
  requireCleanGitOrAllowDirty,
  resolveInputFile,
  writeFootprint,
  writeYamlAtomic,
} from '../lib/input';
import { getRepoPath } from '../../../../lib/repo';
import { deriveSeasonId, normalizeSeasonId } from '../lib/season';
import { readJsonl } from '../../scribe/lib/jsonl';
import { error, info } from '../../scribe/lib/report';
import type { CanonicalDate } from '../../scribe/types.ts';

export async function apply(fileArg?: string, opts?: any) {
  requireCleanGitOrAllowDirty(opts);

  const trails = loadTrails();
  const meta = loadMeta();
  const havens = loadHavens();

  // Use shared input helper for file selection
  const file = await resolveInputFile(fileArg, meta, opts);

  // File type detection
  if (isRolloverFile(file)) {
    const events = readJsonl(file);
    const rollover = events.find(e => e.kind === 'season_rollover');
    if (!rollover || !rollover.payload?.seasonId) {
      error('Validation error: Rollover file missing season_rollover event or seasonId.');
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
      error(`Validation error: Rollover is not for the next unapplied season. Expected: ${chrono.expected}`);
      process.exit(4);
    }
    // --- Rollover apply logic ---
    const before: Record<string, string> = {};
    for (const [edge, data] of Object.entries(trails)) {
      if (!data.permanent) {
        before[edge] = { ...data };
      }
    }
    const effects = applyRolloverToTrails(trails, havens, false);
    // If no changes (all lists empty), treat as no-op
    if (
      effects.maintained.length === 0 &&
      effects.persisted.length === 0 &&
      effects.deletedTrails.length === 0
    ) {
      info('No changes would be made.');
      process.exit(5);
    }
    // Update meta
    if (!meta.rolledSeasons) meta.rolledSeasons = [];
    meta.rolledSeasons.push(seasonId);
    appendToMetaAppliedSessions(meta, fileId);
    // Write trails.yaml and meta.yaml
    try {
      writeYamlAtomic(getRepoPath('data', 'trails.yml'), trails);
      writeYamlAtomic(getRepoPath('data', 'meta.yaml'), meta);
      // Write footprint
      const after: Record<string, string> = {};
      for (const [edge, data] of Object.entries(trails)) {
        if (!data.permanent) {
          after[edge] = { ...data };
        }
      }
      const footprint = {
        id: `ROLL-${seasonId}`,
        kind: 'rollover',
        seasonId,
        appliedAt: new Date().toISOString(),
        inputs: { sourceFile: file },
        effects: { rollover: effects },
        touched: { before, after }
      };
      writeFootprint(footprint);
      info('Rollover applied.');
      process.exit(0);
    } catch (e) {
      error('I/O error during apply: ' + e);
      process.exit(6);
    }
  } else if (isSessionFile(file)) {
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
    const seasonIds = dayStarts.map(e => {
      const calDate = e.payload?.calendarDate as CanonicalDate;
      return deriveSeasonId(calDate);
    });
    const firstSeasonId = seasonIds[0];
    if (!seasonIds.every(sid => normalizeSeasonId(sid) === normalizeSeasonId(firstSeasonId))) {
      error('Validation error: Multi-season session detected. All events must share the same season.');
      process.exit(4);
    }
    const chrono = isSessionChronologyValid(meta, firstSeasonId);
    if (!chrono.valid) {
      error(`Validation error: Missing required rollover(s) for season ${firstSeasonId}: ${chrono.missing.join(', ')}`);
      process.exit(4);
    }
    const fileId = path.basename(file);
    if (isSessionAlreadyApplied(meta, fileId)) {
      info('Session already applied.');
      process.exit(3);
    }

    // --- Session apply logic ---
    let changed = false;
    const created: string[] = [];
    const usedFlags: Record<string, boolean> = {};
    const rediscovered: string[] = [];
    let currentHex: string | null = null;
    let currentSeason = firstSeasonId;

    // Find session_start
    const sessionStart = events.find(e => e.kind === 'session_start');
    if (sessionStart && sessionStart.payload.startHex) {
      currentHex = sessionStart.payload.startHex as string;
    }

    const mostRecentRoll = getMostRecentRolloverFootprint(firstSeasonId);
    const deletedTrails = mostRecentRoll?.effects?.rollover?.deletedTrails || [];
    // Main event loop
    for (const e of events) {
      if (e.kind === 'day_start') {
        const calDate = e.payload?.calendarDate as CanonicalDate;
        currentSeason = deriveSeasonId(calDate);
      }
      if (e.kind === 'trail' && e.payload.marked) {
        const edge = canonicalEdgeKey(e.payload.from as string, e.payload.to as string);
        if (!trails[edge]) {
          trails[edge] = { permanent: false, streak: 0 };
          created.push(edge);
          changed = true;
        }
        trails[edge].usedThisSeason = true;
        trails[edge].lastSeasonTouched = currentSeason;
        usedFlags[edge] = true;
      }
      if (e.kind === 'move') {
        let from = e.payload.from as string | null;
        let to = e.payload.to as string;
        if (!from && currentHex) from = currentHex;
        if (!from || !to) continue;
        const edge = canonicalEdgeKey(from, to);
        currentHex = to;
        if (trails[edge]) {
          trails[edge].usedThisSeason = true;
          trails[edge].lastSeasonTouched = currentSeason;
          usedFlags[edge] = true;
        } else if (deletedTrails.includes(edge)) {
          // Rediscovery/paradox
          trails[edge] = { permanent: false, streak: 0, usedThisSeason: true, lastSeasonTouched: currentSeason };
          rediscovered.push(edge);
          usedFlags[edge] = true;
          changed = true;
        }
      }
    }
    if (!changed && !created.length && !rediscovered.length && !Object.keys(usedFlags).length) {
      info('No changes would be made.');
      process.exit(5);
    }
    // Write trails.yaml
    try {
      writeYamlAtomic(getRepoPath('data', 'trails.yml'), trails);
      appendToMetaAppliedSessions(meta, fileId);
      writeYamlAtomic(getRepoPath('data', 'meta.yaml'), meta);

      // Write footprint
      const footprint = {
        id: `S-${fileId.replace(/\..*$/, '')}`,
        kind: 'session',
        seasonId: firstSeasonId,
        appliedAt: new Date().toISOString(),
        inputs: { sourceFile: file },
        effects: {
          session: {
            created,
            usedFlags,
            rediscovered
          }
        }
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

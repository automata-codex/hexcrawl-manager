import fs from 'fs';
import yaml from 'yaml';
import path from 'path';
import {
  appendToMetaAppliedSessions,
  canonicalEdgeKey,
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
import {
  compareSeasonIds,
  deriveSeasonId,
  normalizeSeasonId
} from '../lib/season';
import { readJsonl } from '../../scribe/lib/jsonl';
import { error, info } from '../../scribe/lib/report';
import type { CanonicalDate } from '../../scribe/types.ts';

// Find most recent ROLL footprint for rediscovery
function getMostRecentRolloverFootprint(seasonId: string): any {
  const footprintsDir = require('../../../../lib/repo').getRepoPath('data', 'session-logs', 'footprints');
  let files: string[] = [];
  try {
    files = fs.readdirSync(footprintsDir)
      .filter((f: string) => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map((f: string) => path.join(footprintsDir, f));
  } catch {
    return null;
  }
  let best: { seasonId: string, file: string, data: any } | null = null;
  for (const file of files) {
    const data = yaml.parse(fs.readFileSync(file, 'utf8'));
    if (data.kind === 'rollover' && data.seasonId) {
      if (!best || compareSeasonIds(data.seasonId, best.seasonId) > 0 && compareSeasonIds(data.seasonId, seasonId) <= 0) {
        best = { seasonId: data.seasonId, file, data };
      }
    }
  }
  return best ? best.data : null;
};

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
    // TODO: implement rollover apply logic
    // eslint-disable-next-line no-console
    console.log('apply: detected rollover file', file);
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
      writeYamlAtomic(require('../../../../lib/repo').getRepoPath('data', 'trails.yml'), trails);
      // Update meta.yaml
      appendToMetaAppliedSessions(meta, fileId);
      writeYamlAtomic(require('../../../../lib/repo').getRepoPath('data', 'meta.yaml'), meta);
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
    // eslint-disable-next-line no-console
    console.error('Unrecognized file type for apply:', file);
    process.exit(4);
  }
}

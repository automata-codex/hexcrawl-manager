import path from 'path';
import {
  isRolloverAlreadyApplied,
  isRolloverChronologyValid,
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
import { error, info } from '../../scribe/lib/report';
import type { CanonicalDate } from '../../scribe/types.ts';

export async function apply(fileArg?: string, opts?: any) {
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
    // TODO: implement session apply logic
    // eslint-disable-next-line no-console
    console.log('apply: detected session file', file);
  } else {
    // eslint-disable-next-line no-console
    console.error('Unrecognized file type for apply:', file);
    process.exit(4);
  }
}

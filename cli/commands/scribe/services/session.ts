import path from 'node:path';
import fs, { existsSync, readdirSync, statSync } from 'node:fs';
import yaml from 'yaml';
import { readEvents, timeNowISO, writeEventsWithHeader } from './event-log';
import { requireFile, requireSession } from '../lib/guards.ts';
import { REPO_PATHS } from '../../shared-lib/constants/repo-paths.ts';
import { type CanonicalDate, type Context, type Event } from '../types';

// Discriminated union for prepareSessionStart return value
export type SessionStartPrep =
  | { ok: false; error: string }
  | {
  ok: true;
  sessionId: string;
  inProgressFile: string;
  lockFile?: string;
  seq?: number;
  dev?: boolean;
};

function getFinalSessionId(basename: string, devMode: boolean, suffix: string) {
  if (devMode) {
    return `${basename}${suffix}`;
  }
  const sessionIdParts = basename.split('_');
  if (sessionIdParts.length !== 3) {
    throw new Error('Invalid sessionId format for production mode.');
  }
  return `${sessionIdParts[0]}_${sessionIdParts[1]}${suffix}_${sessionIdParts[2]}`;
}

/** Latest in-progress file by mtime, or null if none. */
export function findLatestInProgress(): { id: string; path: string } | null {
  const prodDir = REPO_PATHS.IN_PROGRESS;
  const devDir = REPO_PATHS.DEV_IN_PROGRESS;
  const candidates: { id: string; path: string; mtime: number }[] = [];

  for (const dir of [prodDir, devDir]) {
    if (!existsSync(dir)) {
      continue;
    }
    const files = readdirSync(dir).filter(f => f.endsWith('.jsonl'));
    for (const f of files) {
      const p = path.join(dir, f);
      const s = statSync(p);
      candidates.push({ id: f.replace(/\.jsonl$/, ''), path: p, mtime: s.mtimeMs });
    }
  }
  if (!candidates.length) {
    return null;
  }
  candidates.sort((a, b) => b.mtime - a.mtime);
  const top = candidates[0];
  return { id: top.id, path: top.path };
}

export const inProgressPathFor = (id: string, devMode?: boolean) => {
  if (devMode) {
    return path.join(REPO_PATHS.DEV_IN_PROGRESS, `${id}.jsonl`);
  }
  return path.join(REPO_PATHS.IN_PROGRESS, `${id}.jsonl`);
};

/**
 * Prepares session start: generates sessionId, file paths, and handles
 * lock/meta logic. Returns a discriminated union: `{ ok: false, error }` or
 * `{ ok: true, sessionId, inProgressFile, ... }`.
 */
export function prepareSessionStart({
  devMode,
  date,
}: {
  devMode: boolean;
  date: Date;
}): SessionStartPrep {
  const pad = (n: number, len = 4) => n.toString().padStart(len, '0');

  if (devMode) {
    const iso = date.toISOString().replace(/[:.]/g, '-');
    const sessionId = `dev_${iso}`;
    const inProgressFile = path.join(REPO_PATHS.DEV_IN_PROGRESS, `${sessionId}.jsonl`);
    return { ok: true, sessionId, inProgressFile, dev: true };
  }

  // Production mode
  if (!fs.existsSync(REPO_PATHS.META)) {
    return { ok: false, error: `❌ Missing meta file at ${REPO_PATHS.META}` };
  }
  const metaRaw = fs.readFileSync(REPO_PATHS.META, 'utf8');
  const meta = yaml.parse(metaRaw) || {};
  const seq = meta.nextSessionSeq;
  if (!seq || typeof seq !== 'number') {
    return { ok: false, error: '❌ Invalid or missing nextSessionSeq in meta.yaml' };
  }
  const ymd = date.toISOString().slice(0, 10);
  const sessionId = `session_${pad(seq)}_${ymd}`;
  const inProgressFile = path.join(REPO_PATHS.IN_PROGRESS, `${sessionId}.jsonl`);

  // Check for lock conflict
  const lockFile = path.join(REPO_PATHS.LOCKS, `session_${pad(seq)}.lock`);
  if (fs.existsSync(lockFile)) {
    return { ok: false, error: `❌ Lock file exists for session sequence ${seq} (${lockFile}). Another session may be active.` };
  }

  // Create lock file
  const lockData = {
    seq,
    filename: `${sessionId}.jsonl`,
    createdAt: date.toISOString(),
    pid: process.pid,
  };
  fs.writeFileSync(lockFile, yaml.stringify(lockData), { flag: 'wx' });

  return { ok: true, sessionId, inProgressFile, lockFile, seq };
}

/**
 * Finalizes an in-progress file, splitting by season, writing rollovers, updating meta/locks, and returning output info.
 * Returns { outputs: string[], rollovers: string[], error?: string }
 */
export function finalizeSession(ctx: Context, devMode = false): { outputs: string[]; rollovers: string[]; error?: string } {
  // 1. Guards
  if (!requireSession(ctx) || !requireFile(ctx)) {
    return { outputs: [], rollovers: [], error: '❌ Missing sessionId or file in context.' };
  }

  const sessionId = ctx.sessionId!; // Checked by `requireSession`
  const inProgressFile = ctx.file!; // Checked by `requireFile`

  // Lock file check (prod only)
  const lockFile = path.join(REPO_PATHS.LOCKS, `${sessionId.replace(/^(session_\d+)_.*$/, '$1')}.lock`);
  if (!devMode && !existsSync(lockFile)) {
    return { outputs: [], rollovers: [], error: `❌ No lock file for session: ${lockFile}` };
  }

  // 2. Load and validate events
  const events = readEvents(inProgressFile);
  if (!events.length) {
    return { outputs: [], rollovers: [], error: '❌ No events found in session file.' };
  }
  if (!events.some(e => e.kind === 'day_start')) {
    return { outputs: [], rollovers: [], error: '❌ No day_start event found in session.' };
  }

  // Sort and check for impossible ordering
  const expandedEvents: (Event & { _origIdx: number })[] = events.map((e, i) => ({ ...e, _origIdx: i }));
  expandedEvents.sort((a, b) => {
    if (a.ts && b.ts) {
      const tsCmp = a.ts.localeCompare(b.ts);
      if (tsCmp !== 0) return tsCmp;
    } else if (a.ts && !b.ts) {
      return -1;
    } else if (!a.ts && b.ts) {
      return 1;
    }
    const aSeq = typeof a.seq === 'number' ? a.seq : Number.POSITIVE_INFINITY;
    const bSeq = typeof b.seq === 'number' ? b.seq : Number.POSITIVE_INFINITY;

    if (aSeq !== bSeq) {
      return aSeq - bSeq;
    }
    return (a._origIdx ?? 0) - (b._origIdx ?? 0);
  });
  for (let i = 1; i < expandedEvents.length; ++i) {
    if (expandedEvents[i].ts && expandedEvents[i-1].ts && expandedEvents[i].ts < expandedEvents[i-1].ts) {
      return { outputs: [], rollovers: [], error: '❌ Non-monotonic timestamps in event log.' };
    }
    if (typeof expandedEvents[i].seq === 'number' && typeof expandedEvents[i-1].seq === 'number' && expandedEvents[i].seq < expandedEvents[i-1].seq) {
      return { outputs: [], rollovers: [], error: '❌ Non-monotonic sequence numbers in event log.' };
    }
  }

  // Append session_end if missing
  if (!events.find(e => e.kind === 'session_end')) {
    events.push({
      seq: (events.at(-1)?.seq ?? 0) + 1,
      ts: timeNowISO(),
      kind: 'session_end',
      payload: { status: 'final' }
    });
  }

  // 3. Split by season (contiguous blocks of same seasonId)
  const blocks: { seasonId: string; events: Event[] }[] = [];
  let currentBlock: { seasonId: string; events: Event[] } | null = null;
  for (const ev of events) {
    if (ev.kind === 'day_start' && ev.payload && ev.payload.calendarDate && ev.payload.season) {
      const calDate: CanonicalDate = ev.payload.calendarDate as CanonicalDate;
      const seasonId = `${calDate.year}-${String(ev.payload.season).toLowerCase()}`;
      if (!currentBlock || currentBlock.seasonId !== seasonId) {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        currentBlock = { seasonId, events: [] };
      }
    }
    if (!currentBlock) {
      // If no day_start yet, skip until first block
      continue;
    }
    currentBlock.events.push(ev);
  }
  if (currentBlock) {
    blocks.push(currentBlock);
  }
  if (!blocks.length) {
    return { outputs: [], rollovers: [], error: '❌ Could not partition events by season.' };
  }

  // 4. Write finalized session files and rollovers
  const outputs: string[] = [];
  const rollovers: string[] = [];
  const sessionDir = devMode
    ? REPO_PATHS.DEV_SESSIONS
    : REPO_PATHS.SESSIONS;
  const rolloverDir = devMode
    ? REPO_PATHS.DEV_ROLLOVERS
    : REPO_PATHS.ROLLOVERS;
  let suffixChar = 'a'.charCodeAt(0);
  let baseName = devMode ? `dev_${events[0].ts?.replace(/[:.]/g, '-')}` : sessionId;

  for (let i = 0; i < blocks.length; ++i) {
    const block = blocks[i];
    const suffix = blocks.length > 1 ? String.fromCharCode(suffixChar + i) : '';
    const finalSessionId = getFinalSessionId(baseName, devMode, suffix);

    // Header
    const inWorldStart = block.events.find(e => e.kind === 'day_start')?.payload?.calendarDate || null;
    const inWorldEnd = block.events.slice().reverse().find(e => e.kind === 'day_start')?.payload?.calendarDate || null;
    const header = {
      kind: 'header',
      id: finalSessionId,
      seasonId: block.seasonId,
      inWorldStart,
      inWorldEnd
    };

    // Reassign seq
    const blockEvents = block.events.map((e, idx) => {
      const ev = { ...e };
      ev.seq = idx + 1;
      return ev;
    });

    // Write session file
    const sessionFile = path.join(sessionDir, `${finalSessionId}.jsonl`);
    writeEventsWithHeader(sessionFile, header, blockEvents);
    outputs.push(sessionFile);

    // Write rollover if not last block
    if (i < blocks.length - 1) {
      const nextSeasonId = blocks[i+1].seasonId;
      const rolloverFile = devMode
        ? path.join(rolloverDir, `dev_rollover_${nextSeasonId}_${events[0].ts?.replace(/[:.]/g, '-')}.jsonl`)
        : path.join(rolloverDir, `rollover_${nextSeasonId}_${events[0].ts?.slice(0,10)}.jsonl`);
      const rolloverEvent = { kind: 'season_rollover', seasonId: nextSeasonId };
      writeEventsWithHeader(rolloverFile, rolloverEvent);
      rollovers.push(rolloverFile);
    }
  }

  // 5. Meta/lock handling
  if (!devMode) {
    // Remove lock file
    if (existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }

    // Remove in-progress file
    if (existsSync(inProgressFile)) {
      fs.unlinkSync(inProgressFile);
    }

    // Update meta.yaml if outputs written
    if (outputs.length) {
      const metaRaw = fs.readFileSync(REPO_PATHS.META, 'utf8');
      const meta = yaml.parse(metaRaw) || {};
      const lockSeq = Number(sessionId.match(/session_(\d+)/)?.[1] || 0);
      if (meta.nextSessionSeq !== lockSeq + 1) {
        meta.nextSessionSeq = lockSeq + 1;
        fs.writeFileSync(REPO_PATHS.META, yaml.stringify(meta));
      }
    }
  } else {
    // Dev: just remove in-progress file
    if (existsSync(inProgressFile)) {
      fs.unlinkSync(inProgressFile);
    }
  }
  return { outputs, rollovers };
}

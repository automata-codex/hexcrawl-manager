import { hexSort, normalizeHexId } from '@skyreach/core';
import fs, { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

import { REPO_PATHS } from '@skyreach/data';
import { loadMeta, saveMeta } from '../../shared-lib/meta.ts';
import { requireFile, requireSession } from '../lib/guards.ts';
import { type CanonicalDate, type Context } from '../types';

import { readEvents, timeNowISO, writeEventsWithHeader } from './event-log';
import { type Event, pad } from '@skyreach/cli-kit';

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
  const prodDir = REPO_PATHS.IN_PROGRESS();
  const devDir = REPO_PATHS.DEV_IN_PROGRESS();
  const candidates: { id: string; path: string; mtime: number }[] = [];

  for (const dir of [prodDir, devDir]) {
    if (!existsSync(dir)) {
      continue;
    }
    const files = readdirSync(dir).filter((f) => f.endsWith('.jsonl'));
    for (const f of files) {
      const p = path.join(dir, f);
      const s = statSync(p);
      candidates.push({
        id: f.replace(/\.jsonl$/, ''),
        path: p,
        mtime: s.mtimeMs,
      });
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
    return path.join(REPO_PATHS.DEV_IN_PROGRESS(), `${id}.jsonl`);
  }
  return path.join(REPO_PATHS.IN_PROGRESS(), `${id}.jsonl`);
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
  if (devMode) {
    const iso = date.toISOString().replace(/[:.]/g, '-');
    const sessionId = `dev_${iso}`;
    const inProgressFile = path.join(
      REPO_PATHS.DEV_IN_PROGRESS(),
      `${sessionId}.jsonl`,
    );
    return { ok: true, sessionId, inProgressFile, dev: true };
  }

  // Production mode
  if (!fs.existsSync(REPO_PATHS.META())) {
    return { ok: false, error: `❌ Missing meta file at ${REPO_PATHS.META()}` };
  }
  const metaRaw = fs.readFileSync(REPO_PATHS.META(), 'utf8');
  const meta = yaml.parse(metaRaw) || {};
  const seq = meta.nextSessionSeq;
  if (!seq || typeof seq !== 'number') {
    return {
      ok: false,
      error: '❌ Invalid or missing nextSessionSeq in meta.yaml',
    };
  }
  const ymd = date.toISOString().slice(0, 10);
  const sessionId = `session_${pad(seq)}_${ymd}`;
  const inProgressFile = path.join(
    REPO_PATHS.IN_PROGRESS(),
    `${sessionId}.jsonl`,
  );

  // Check for lock conflict
  const lockFile = path.join(REPO_PATHS.LOCKS(), `session_${pad(seq)}.lock`);
  if (fs.existsSync(lockFile)) {
    return {
      ok: false,
      error: `❌ Lock file exists for session sequence ${seq} (${lockFile}). Another session may be active.`,
    };
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
export function finalizeSession(
  ctx: Context,
  devMode = false,
): { outputs: string[]; rollovers: string[]; error?: string } {
  // 1. Guards
  if (!requireSession(ctx) || !requireFile(ctx)) {
    return {
      outputs: [],
      rollovers: [],
      error: '❌ Missing sessionId or file in context.',
    };
  }

  const sessionId = ctx.sessionId!; // Checked by `requireSession`
  const inProgressFile = ctx.file!; // Checked by `requireFile`

  // Lock file check (prod only)
  const lockFile = path.join(
    REPO_PATHS.LOCKS(),
    `${sessionId.replace(/^(session_\d+)_.*$/, '$1')}.lock`,
  );
  if (!devMode && !existsSync(lockFile)) {
    return {
      outputs: [],
      rollovers: [],
      error: `❌ No lock file for session: ${lockFile}`,
    };
  }

  // 2. Load and validate events
  const events = readEvents(inProgressFile);
  if (!events.length) {
    return {
      outputs: [],
      rollovers: [],
      error: '❌ No events found in session file.',
    };
  }
  if (!events.some((e) => e.kind === 'day_start')) {
    return {
      outputs: [],
      rollovers: [],
      error: '❌ No day_start event found in session.',
    };
  }
  // Ensure the first event is session_start or session_continue
  if (
    !(
      events[0].kind === 'session_start' ||
      events[0].kind === 'session_continue'
    )
  ) {
    return {
      outputs: [],
      rollovers: [],
      error: '❌ First event must be session_start or session_continue.',
    };
  }
  // Ensure session_pause only appears at the end (if at all)
  const pauseIdx = events.findIndex((e) => e.kind === 'session_pause');
  if (pauseIdx !== -1 && pauseIdx !== events.length - 1) {
    return {
      outputs: [],
      rollovers: [],
      error: '❌ session_pause may only appear at the end of the file.',
    };
  }

  // Sort and check for impossible ordering
  const expandedEvents: (Event & { _origIdx: number })[] = events.map(
    (e, i) => ({ ...e, _origIdx: i }),
  );
  expandedEvents.sort((a, b) => {
    if (a.ts && b.ts) {
      const tsCmp = a.ts.localeCompare(b.ts);
      if (tsCmp !== 0) {
        return tsCmp;
      }
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
  for (let i = 1; i < expandedEvents.length; i++) {
    if (
      expandedEvents[i].ts &&
      expandedEvents[i - 1].ts &&
      expandedEvents[i].ts < expandedEvents[i - 1].ts
    ) {
      return {
        outputs: [],
        rollovers: [],
        error: '❌ Non-monotonic timestamps in event log.',
      };
    }
    if (
      typeof expandedEvents[i].seq === 'number' &&
      typeof expandedEvents[i - 1].seq === 'number' &&
      expandedEvents[i].seq < expandedEvents[i - 1].seq
    ) {
      return {
        outputs: [],
        rollovers: [],
        error: '❌ Non-monotonic sequence numbers in event log.',
      };
    }
  }

  // 3. Event Finalization: Ensure session_end or session_pause at end
  const lastEvent = events[events.length - 1];
  if (lastEvent.kind !== 'session_end' && lastEvent.kind !== 'session_pause') {
    // Append session_end with { status: "final" } and incremented sequence
    events.push({
      seq: (lastEvent.seq ?? 0) + 1,
      ts: timeNowISO(),
      kind: 'session_end',
      payload: { status: 'final' },
    });
  }

  // --- Revised Block Construction by Season ---
  // (a) Sort events and track original index
  const sortedEvents = events
    .map((e, i) => ({ ...e, _origIdx: i }))
    .sort((a, b) => {
      if (a.ts && b.ts) {
        const tsCmp = a.ts.localeCompare(b.ts);
        if (tsCmp !== 0) {
          return tsCmp;
        }
      } else if (a.ts && !b.ts) {
        return -1;
      } else if (!a.ts && b.ts) {
        return 1;
      }
      const aSeq = typeof a.seq === 'number' ? a.seq : Number.POSITIVE_INFINITY;
      const bSeq = typeof b.seq === 'number' ? b.seq : Number.POSITIVE_INFINITY;
      if (aSeq !== bSeq) return aSeq - bSeq;
      return a._origIdx - b._origIdx;
    });

  // (b) Identify all day_start events and their seasonId, build block windows by season
  const dayStartIndices = sortedEvents
    .map((e, i) => {
      const calendarDate = e.payload?.calendarDate as CanonicalDate;
      return e.kind === 'day_start'
        ? {
            i,
            seasonId: `${calendarDate.year}-${String(e.payload?.season).toLowerCase()}`,
          }
        : null;
    })
    .filter(Boolean) as { i: number; seasonId: string }[];
  if (!dayStartIndices.length) {
    return {
      outputs: [],
      rollovers: [],
      error: '❌ No day_start event found in session.',
    };
  }

  // Group consecutive day_starts with the same seasonId into a single block
  const blockWindows: { start: number; end: number; seasonId: string }[] = [];
  let currentSeason = dayStartIndices[0].seasonId;
  let blockStart = dayStartIndices[0].i;
  for (let b = 1; b < dayStartIndices.length; ++b) {
    if (dayStartIndices[b].seasonId !== currentSeason) {
      blockWindows.push({
        start: blockStart,
        end: dayStartIndices[b].i,
        seasonId: currentSeason,
      });
      currentSeason = dayStartIndices[b].seasonId;
      blockStart = dayStartIndices[b].i;
    }
  }

  // Add the final block
  blockWindows.push({
    start: blockStart,
    end: sortedEvents.length,
    seasonId: currentSeason,
  });

  // (c) Assign events to blocks (no duplication)
  // Track which block each event belongs to
  const eventBlockAssignment = new Array(sortedEvents.length).fill(-1);
  // Events before first day_start go in first block
  for (let i = 0; i < blockWindows[0].start; ++i) {
    eventBlockAssignment[i] = 0;
  }
  // Events after last day_start go in last block
  for (
    let i = blockWindows[blockWindows.length - 1].end;
    i < sortedEvents.length;
    ++i
  ) {
    eventBlockAssignment[i] = blockWindows.length - 1;
  }
  // Events inside each window
  for (let b = 0; b < blockWindows.length; ++b) {
    for (let i = blockWindows[b].start; i < blockWindows[b].end; ++i) {
      eventBlockAssignment[i] = b;
    }
  }

  // (d) Build blocks with assigned events
  const blocks: {
    seasonId: string;
    events: (Event & { _origIdx: number })[];
  }[] = blockWindows.map((win, b) => ({
    seasonId: win.seasonId,
    events: sortedEvents.filter((_, i) => eventBlockAssignment[i] === b),
  }));

  // --- Synthesize lifecycle events at block boundaries ---
  // Helper: get last known cursor/party/date up to a given event index
  function getSnapshot(upToIdx: number) {
    let currentHex = null;
    let currentParty = null;
    let currentDate = null;
    for (let i = 0; i <= upToIdx; ++i) {
      const e = sortedEvents[i];
      if (e.kind === 'move' && e.payload?.to) {
        currentHex = e.payload.to;
      }
      if (e.kind === 'trail' && e.payload?.to) {
        currentHex = e.payload.to;
      }
      if (e.kind.startsWith('party_') && e.payload?.party) {
        currentParty = e.payload.party;
      }
      if (e.kind === 'day_start' && e.payload?.calendarDate) {
        currentDate = e.payload.calendarDate;
      }
      if (e.kind === 'session_start' && e.payload?.startHex) {
        currentHex = e.payload.startHex;
      }
      if (e.kind === 'session_start' && e.payload?.party) {
        currentParty = e.payload.party;
      }
    }
    return { currentHex, currentParty, currentDate };
  }

  // Find original session_start, session_continue, session_end
  const origSessionStart = sortedEvents.find((e) => e.kind === 'session_start');
  const sessionIdVal = sessionId;

  // For each block, synthesize lifecycle events as needed (avoid referencing finalizedBlocks before initialization)
  const finalizedBlocks: {
    seasonId: string;
    events: (Event & { _origIdx: number })[];
  }[] = [];
  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const block = blocks[bIdx];
    let blockEvents = [...block.events];
    const firstDayIdx = block.events.findIndex((e) => e.kind === 'day_start');
    const firstDayEvent = block.events[firstDayIdx];
    // --- Block start ---
    if (bIdx === 0) {
      // Block 1: must begin with session_start or session_continue (if present before first day)
      const preFirstDay = block.events.slice(0, firstDayIdx);
      const hasStart = preFirstDay.find((e) => e.kind === 'session_start');
      const hasCont = preFirstDay.find((e) => e.kind === 'session_continue');
      if (!hasStart && !hasCont) {
        // Insert synthetic session_start
        const payload = origSessionStart?.payload || {
          status: 'in-progress',
          id: sessionIdVal,
        };
        blockEvents.unshift({
          kind: 'session_start',
          ts: firstDayEvent.ts,
          seq: 0,
          payload: { ...payload, status: 'in-progress', id: sessionIdVal },
          _origIdx: -1,
        });
      }
    } else {
      // Block 2..N: must begin with session_continue (if present before first day)
      const preFirstDay = block.events.slice(0, firstDayIdx);
      const hasCont = preFirstDay.find((e) => e.kind === 'session_continue');
      if (!hasCont) {
        // Insert synthetic session_continue with snapshot
        const prevBlock = finalizedBlocks[bIdx - 1];
        const prevLastIdx =
          bIdx === 0
            ? 0
            : sortedEvents.findIndex(
                (e) =>
                  e._origIdx ===
                  prevBlock.events[prevBlock.events.length - 1]._origIdx,
              );
        const snap = getSnapshot(prevLastIdx);
        blockEvents.unshift({
          kind: 'session_continue',
          ts: firstDayEvent.ts,
          seq: 0,
          payload: {
            status: 'in-progress',
            id: sessionIdVal,
            currentHex: snap.currentHex,
            currentParty: snap.currentParty,
            currentDate: firstDayEvent.payload?.calendarDate,
          },
          _origIdx: -1,
        });
      }
    }
    // --- Block end ---
    const lastDayIdx =
      block.events
        .map((e, i) => (e.kind === 'day_start' ? i : -1))
        .filter((i) => i !== -1)
        .pop() ?? block.events.length - 1;
    const afterLastDay = block.events.slice(lastDayIdx + 1);
    if (bIdx < blocks.length - 1) {
      // Intermediate blocks: must end with session_pause after last day event
      const hasPause = afterLastDay.find((e) => e.kind === 'session_pause');
      if (!hasPause) {
        blockEvents.push({
          kind: 'session_pause',
          ts: block.events[lastDayIdx]?.ts || timeNowISO(),
          seq: 0,
          payload: { status: 'paused', id: sessionIdVal },
          _origIdx: -1,
        });
      }
    } else {
      // Final block: must end with session_end
      const hasEnd = afterLastDay.find((e) => e.kind === 'session_end');
      if (!hasEnd) {
        blockEvents.push({
          kind: 'session_end',
          ts: block.events[block.events.length - 1]?.ts || timeNowISO(),
          seq: 0,
          payload: { status: 'final', id: sessionIdVal },
          _origIdx: -1,
        });
      }
    }

    // --- Normalization: seasonId and trail edges ---
    // Normalize seasonId
    block.seasonId = block.seasonId.toLowerCase();
    // Canonicalize trail edges: use hexSort on from/to if both present
    blockEvents = blockEvents.map((ev) => {
      if (
        ev.kind === 'trail' &&
        ev.payload &&
        ev.payload.from &&
        ev.payload.to
      ) {
        let { from, to } = ev.payload as { from: string; to: string };
        from = normalizeHexId(from);
        to = normalizeHexId(to);
        if (hexSort(from, to) > 0) {
          // Swap so from < to by hexSort
          return { ...ev, payload: { ...ev.payload, from: to, to: from } };
        }
      }
      return ev;
    });

    // --- Sorting & seq ---
    blockEvents = blockEvents
      .sort((a, b) => {
        if (a.ts && b.ts) {
          const tsCmp = a.ts.localeCompare(b.ts);
          if (tsCmp !== 0) return tsCmp;
        } else if (a.ts && !b.ts) return -1;
        else if (!a.ts && b.ts) return 1;
        const aSeq =
          typeof a.seq === 'number' ? a.seq : Number.POSITIVE_INFINITY;
        const bSeq =
          typeof b.seq === 'number' ? b.seq : Number.POSITIVE_INFINITY;
        if (aSeq !== bSeq) return aSeq - bSeq;
        return 0;
      })
      .map((e, idx) => ({ ...e, seq: idx + 1 }));
    finalizedBlocks.push({ seasonId: block.seasonId, events: blockEvents });
  }

  // 4. Write finalized session files and rollovers
  const outputs: string[] = [];
  const rollovers: string[] = [];
  const sessionDir = devMode
    ? REPO_PATHS.DEV_SESSIONS()
    : REPO_PATHS.SESSIONS();
  const rolloverDir = devMode
    ? REPO_PATHS.DEV_ROLLOVERS()
    : REPO_PATHS.ROLLOVERS();
  let suffixChar = 'a'.charCodeAt(0);

  for (let i = 0; i < finalizedBlocks.length; i++) {
    const block = finalizedBlocks[i];
    const suffix = blocks.length > 1 ? String.fromCharCode(suffixChar + i) : '';
    const finalSessionId = getFinalSessionId(sessionId, devMode, suffix);

    // Header
    const inWorldStart =
      block.events.find((e) => e.kind === 'day_start')?.payload?.calendarDate ||
      null;
    const inWorldEnd =
      block.events
        .slice()
        .reverse()
        .find((e) => e.kind === 'day_start')?.payload?.calendarDate || null;
    const header = {
      kind: 'header',
      id: finalSessionId,
      seasonId: block.seasonId,
      inWorldStart,
      inWorldEnd,
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
    if (i < finalizedBlocks.length - 1) {
      const nextSeasonId = finalizedBlocks[i + 1].seasonId;
      const rolloverFile = devMode
        ? path.join(
            rolloverDir,
            `dev_rollover_${nextSeasonId}_${events[0].ts?.replace(/[:.]/g, '-')}.jsonl`,
          )
        : path.join(
            rolloverDir,
            `rollover_${nextSeasonId}_${events[0].ts?.slice(0, 10)}.jsonl`,
          );
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
      const lockSeq = Number(sessionId.match(/session_(\d+)/)?.[1] || 0);
      const meta = loadMeta();
      if (meta.nextSessionSeq !== lockSeq + 1) {
        saveMeta({ nextSessionSeq: lockSeq + 1 });
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

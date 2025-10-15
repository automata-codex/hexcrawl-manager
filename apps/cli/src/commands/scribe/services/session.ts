import { warn } from '@skyreach/cli-kit';
import { hexSort, normalizeHexId } from '@skyreach/core';
import {
  REPO_PATHS,
  buildSessionFilename,
  getLatestSessionNumber,
  loadMeta,
  parseSessionFilename,
  saveMeta,
} from '@skyreach/data';
import {
  SessionId,
  assertSessionId,
  makeSessionId,
  parseSessionId,
  type CampaignDate,
  type DayStartEvent,
  type ScribeEvent,
  type SessionContinueEvent,
  type SessionEndEvent,
  type SessionPauseEvent,
} from '@skyreach/schemas';
import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';

import {
  readEvents,
  timeNowISO,
  writeEventsWithHeader,
} from '../../../services/event-log.service';
import { type Context } from '../types';

import { requireFile, requireSession } from './general';
import {
  createLockFile,
  getLockFilePath,
  LockData,
  lockExists,
  readLockFile,
  removeLockFile,
} from './lock-file';

// Discriminated union for prepareSessionStart return value
export type SessionStartPrep =
  | { ok: false; error: string }
  | {
      ok: true;
      sessionId: SessionId;
      inProgressFile: string;
      lockFile?: string;
      seq?: number;
      dev?: boolean;
    };

function getSessionDateFromEvents(events: ScribeEvent[]): string {
  const startEvent = events.find((e) => e.kind === 'session_start');
  if (startEvent?.payload?.sessionDate) {
    return startEvent.payload.sessionDate;
  }
  throw new Error('Unable to determine session date from events.');
}

/** Latest in-progress file by mtime, or null if none. */
export function findLatestInProgress(): { id: SessionId; path: string } | null {
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
  return { id: assertSessionId(top.id), path: top.path };
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
  sessionNumber,
}: {
  devMode: boolean;
  date: Date;
  sessionNumber?: number;
}): SessionStartPrep {
  if (devMode) {
    // const iso = date.toISOString().replace(/[:.]/g, '-');
    // const sessionId = `dev_${iso}`;
    // const inProgressFile = path.join(
    //   REPO_PATHS.DEV_IN_PROGRESS(),
    //   `${sessionId}.jsonl`,
    // );
    // return { ok: true, sessionId, inProgressFile, dev: true };
    throw new Error('Dev mode not supported for session start.');
  }

  // Production mode
  let seq = 0;
  if (sessionNumber) {
    if (!Number.isInteger(sessionNumber) || sessionNumber < 1) {
      return {
        ok: false,
        error: '❌ Session number must be a positive integer.',
      };
    }

    // Check for an existing lock file for the given session number
    const testSessionId = makeSessionId(sessionNumber);
    if (lockExists(testSessionId)) {
      return {
        ok: false,
        error: `❌ Lock file exists for session sequence ${sessionNumber} (${getLockFilePath(
          testSessionId,
        )}). Another session may be active.`,
      };
    }

    // Check for an existing finalized session file with this number
    const sessionFiles = readdirSync(REPO_PATHS.SESSIONS()).filter((f) =>
      f.endsWith('.jsonl'),
    );
    const existingSession = sessionFiles.find((f) =>
      f.startsWith(testSessionId),
    );
    if (existingSession) {
      return {
        ok: false,
        error: `❌ Finalized session file already exists for session sequence ${sessionNumber}.`,
      };
    }

    seq = sessionNumber;
  } else {
    if (!existsSync(REPO_PATHS.META())) {
      return {
        ok: false,
        error: `❌ Missing meta file at ${REPO_PATHS.META()}`,
      };
    }
    const meta = loadMeta();
    seq = meta.nextSessionSeq;
  }
  const ymd = date.toISOString().slice(0, 10);
  const sessionId = makeSessionId(seq);
  const inProgressFile = path.join(
    REPO_PATHS.IN_PROGRESS(),
    buildSessionFilename(sessionId, ymd),
  );

  // Check for lock conflict
  const lockFile = getLockFilePath(sessionId);
  if (lockExists(sessionId)) {
    return {
      ok: false,
      error: `❌ Lock file exists for session sequence ${seq} (${lockFile}). Another session may be active.`,
    };
  }

  // Create lock file
  const lockData: LockData = {
    seq,
    filename: path.basename(inProgressFile),
    createdAt: date.toISOString(),
    pid: process.pid,
  };
  createLockFile(sessionId, lockData);

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
  const contextCheck = validateSessionContext(ctx);
  if (contextCheck.error) {
    return { outputs: [], rollovers: [], error: contextCheck.error };
  }
  const lockCheck = validateLockFile(ctx, devMode);
  if (lockCheck.error) {
    return { outputs: [], rollovers: [], error: lockCheck.error };
  }

  const sessionId = assertSessionId(ctx.sessionId!);
  const inProgressFile = ctx.file!;

  // 2. Load and validate events
  const events = readEvents(inProgressFile);
  const eventCheck = validateEventLog(ctx, events);
  if (eventCheck.error) {
    return { outputs: [], rollovers: [], error: eventCheck.error };
  }

  // 3. Sort and check for impossible ordering
  const { sortedEvents, error: sortError } = sortAndValidateEvents(events);
  if (sortError) {
    return { outputs: [], rollovers: [], error: sortError };
  }

  // 4. Block construction by season
  const sessionDate = getSessionDateFromEvents(events);
  const { blocks, error: blockError } = buildSeasonBlocks(sortedEvents);
  if (blockError) {
    return { outputs: [], rollovers: [], error: blockError };
  }

  // 5. Event Finalization: Ensure session_end or session_pause at end
  const lastEvent = events[events.length - 1];
  if (lastEvent.kind !== 'session_end' && lastEvent.kind !== 'session_pause') {
    // Append session_end with { status: "final" } and incremented sequence
    events.push({
      seq: (lastEvent.seq ?? 0) + 1,
      ts: timeNowISO(),
      kind: 'session_end',
      payload: { id: sessionId, status: 'final' },
    });
  }

  // --- Synthesize lifecycle events at block boundaries ---
  // Helper: get last known cursor/party/date up to a given event index
  function getSnapshot(upToIdx: number) {
    let currentHex = 'null';
    let currentParty = ['null'];
    let currentDate = {} as CampaignDate;
    for (let i = 0; i <= upToIdx; ++i) {
      const e = sortedEvents[i];
      if (e.kind === 'move' && e.payload?.to) {
        currentHex = e.payload.to;
      }
      if (e.kind === 'trail' && e.payload?.to) {
        currentHex = e.payload.to;
      }
      if (e.kind === 'party_set' && e.payload?.ids) {
        currentParty = e.payload.ids;
      }
      if (e.kind === 'day_start' && e.payload?.calendarDate) {
        currentDate = e.payload.calendarDate;
      }
      if (e.kind === 'session_start' && e.payload?.startHex) {
        currentHex = e.payload.startHex;
      }
    }
    return { currentHex, currentParty, currentDate };
  }

  const sessionIdVal = sessionId;

  // For each block, synthesize lifecycle events as needed (avoid referencing finalizedBlocks before initialization)
  const finalizedBlocks: {
    seasonId: string;
    events: (ScribeEvent & { _origIdx: number })[];
  }[] = [];
  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const block = blocks[bIdx];
    let blockEvents = [...block.events];
    const firstDayIdx = block.events.findIndex((e) => e.kind === 'day_start');
    const firstDayEvent = block.events[firstDayIdx] as DayStartEvent;
    // --- Block start ---
    if (bIdx === 0) {
      // Block 1: must begin with session_start or session_continue (if present before first day)
      const preFirstDay = block.events.slice(0, firstDayIdx);
      const hasStart = preFirstDay.find((e) => e.kind === 'session_start');
      const hasCont = preFirstDay.find((e) => e.kind === 'session_continue');
      if (!hasStart && !hasCont) {
        throw new Error(
          'Initial session_start missing; cannot synthesize without startHex.',
        );
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
            currentDate: firstDayEvent.payload.calendarDate,
            sessionDate,
          },
          _origIdx: -1,
        } satisfies SessionContinueEvent & { _origIdx: number });
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
        } satisfies SessionPauseEvent & { _origIdx: number });
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
        } satisfies SessionEndEvent & { _origIdx: number });
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
      payload: {
        id: suffix ? `${sessionId}${suffix}` : sessionId,
        seasonId: block.seasonId,
        inWorldStart,
        inWorldEnd,
      },
    };

    // Reassign seq
    const blockEvents = block.events.map((e, idx) => {
      const ev = { ...e };
      ev.seq = idx + 1;
      return ev;
    });

    // Write session file
    const sessionFile = path.join(
      sessionDir,
      buildSessionFilename(sessionId, sessionDate, suffix),
    );
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
            `rollover_${nextSeasonId}.jsonl`,
          );
      if (!existsSync(rolloverFile)) {
        const rolloverEvent = { kind: 'season_rollover', payload: { seasonId: nextSeasonId } };
        writeEventsWithHeader(rolloverFile, rolloverEvent);
        rollovers.push(rolloverFile);
      }
    }
  }

  // 5. Meta/lock handling
  if (!devMode) {
    // Remove lock file
    removeLockFile(sessionId);

    // Remove in-progress file
    if (existsSync(inProgressFile)) {
      unlinkSync(inProgressFile);
    }

    // Update meta.yaml if outputs written
    if (outputs.length) {
      const { number: sessionIdSeq } = parseSessionId(sessionId);
      const meta = loadMeta();
      if (sessionIdSeq < meta.nextSessionSeq) {
        // Heal meta.nextSessionSeq to max finalized seq + 1
        const maxSeq = getLatestSessionNumber() ?? sessionIdSeq;
        warn(
          `⚠️ Session sequence (${sessionIdSeq}) is less than meta.nextSessionSeq (${meta.nextSessionSeq}). Healing meta to ${maxSeq + 1}.`
        );
        saveMeta({ nextSessionSeq: maxSeq + 1 });
      } else if (meta.nextSessionSeq !== sessionIdSeq + 1) {
        saveMeta({ nextSessionSeq: sessionIdSeq + 1 });
      }
    }
  } else {
    // Dev: just remove in-progress file
    if (existsSync(inProgressFile)) {
      unlinkSync(inProgressFile);
    }
  }
  return { outputs, rollovers };
}

function buildSeasonBlocks(sortedEvents: (ScribeEvent & { _origIdx: number })[]): { blocks: { seasonId: string; events: (ScribeEvent & { _origIdx: number })[] }[]; error?: string } {
  // (a) Identify all day_start events and their seasonId, build block windows by season
  const dayStartIndices = sortedEvents
    .map((e, i) => {
      return e.kind === 'day_start'
        ? {
          i,
          seasonId: `${e.payload.calendarDate.year}-${String(e.payload?.season).toLowerCase()}`,
        }
        : null;
    })
    .filter(Boolean) as { i: number; seasonId: string }[];
  if (!dayStartIndices.length) {
    return { blocks: [], error: '❌ No day_start event found in session.' };
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
    events: (ScribeEvent & { _origIdx: number })[];
  }[] = blockWindows.map((win, b) => ({
    seasonId: win.seasonId,
    events: sortedEvents.filter((_, i) => eventBlockAssignment[i] === b),
  }));

  return { blocks };
}

function sortAndValidateEvents(events: ScribeEvent[]): { sortedEvents: (ScribeEvent & { _origIdx: number })[]; error?: string } {
  const expandedEvents: (ScribeEvent & { _origIdx: number })[] = events.map(
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
    return a._origIdx - b._origIdx;
  });

  for (let i = 1; i < expandedEvents.length; i++) {
    // Check for monotonic timestamps
    if (expandedEvents[i].ts && expandedEvents[i - 1].ts && expandedEvents[i].ts < expandedEvents[i - 1].ts) {
      return { sortedEvents: expandedEvents, error: '❌ Events are not in monotonic timestamp order.' };
    }

    // Check for monotonic sequence numbers
    if (
      typeof expandedEvents[i].seq === 'number' &&
      typeof expandedEvents[i - 1].seq === 'number' &&
      expandedEvents[i].seq < expandedEvents[i - 1].seq
    ) {
      return { sortedEvents: expandedEvents, error: '❌ Non-monotonic sequence numbers in event log.' };
    }
  }

  return { sortedEvents: expandedEvents };
}

function validateEventLog(ctx: Context, events: ScribeEvent[]): { error?: string } {
  if (!events.length) {
    return { error: '❌ No events found in session file.' };
  }

  // Check session date in filename matches session_start event
  let parsedInfo;
  try {
    parsedInfo = parseSessionFilename(path.basename(ctx.file!));
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    parsedInfo = null;
  }
  if (!parsedInfo || !parsedInfo.date) {
    return { error: `❌ Could not parse session date from filename: ${ctx.file}` };
  }
  const filenameSessionDate = parsedInfo.date;
  const eventSessionDate = getSessionDateFromEvents(events);
  if (filenameSessionDate !== eventSessionDate) {
    return { error: `❌ Session date in filename (${filenameSessionDate}) does not match session_start event (${eventSessionDate}).` };
  }

  // Ensure the first event is session_start or session_continue
  if (
    !(
      events[0].kind === 'session_start' ||
      events[0].kind === 'session_continue'
    )
  ) {
    return { error: '❌ First event must be session_start or session_continue.' };
  }
  const pauseIdx = events.findIndex((e) => e.kind === 'session_pause');
  if (pauseIdx !== -1 && pauseIdx !== events.length - 1) {
    return { error: '❌ session_pause may only appear at the end of the file.' };
  }
  return {};
}

function validateLockFile(ctx: Context, devMode: boolean): { error?: string } {
  if (devMode) return {};
  const sessionId = assertSessionId(ctx.sessionId!);
  const lockFile = getLockFilePath(sessionId);
  if (!lockExists(sessionId)) {
    return { error: `❌ No lock file for session: ${lockFile}` };
  }
  const lockData = readLockFile(sessionId);
  if (!lockData) {
    return { error: `❌ Could not parse lock file: ${lockFile}` };
  }
  const { number: sessionIdSeq } = parseSessionId(sessionId);
  if (lockData.seq !== sessionIdSeq) {
    return { error: `❌ SessionId sequence (${sessionIdSeq}) does not match lock file seq (${lockData.seq}) for session: ${sessionId}` };
  }
  return {};
}

function validateSessionContext(ctx: Context): { error?: string } {
  if (!requireSession(ctx) || !requireFile(ctx)) {
    return { error: '❌ Missing sessionId or file in context.' };
  }
  return {};
}

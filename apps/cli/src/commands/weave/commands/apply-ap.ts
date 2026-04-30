import {
  SessionFingerprintMismatchError,
  SessionReportValidationError,
  formatDate,
} from '@achm/core';
import {
  REPO_PATHS,
  appendApEntries,
  buildSessionApEntries,
  discoverCompletedReports,
  discoverFinalizedLogs,
  discoverFinalizedLogsForOrThrow,
  readAllFinalizedLogsForSession,
  readApLedger,
  writeYamlAtomic,
} from '@achm/data';
import {
  ApLedgerEntry,
  ApLedgerEntrySchema,
  MilestoneAllocation,
  SessionReportSchema,
  assertSessionId,
  padSessionNum,
  type NoteEvent,
  type SessionId,
  type TodoEvent,
  type TodoItem,
} from '@achm/schemas';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { ZodError } from 'zod';

import pkg from '../../../../package.json' assert { type: 'json' };
import { eventsOf } from '../../../services/event-log.service';
import { isGuest } from '../../../services/party-member.service';
import {
  firstCalendarDate,
  lastCalendarDate,
  selectParty,
} from '../../../services/projectors.service';
import {
  pickNextSessionId,
  sortScribeIds,
} from '../../../services/sessions.service';
import { computeApForSession } from '../lib/core/compute-ap-for-session';

interface ApplyApOptions {
  sessionId?: SessionId;
}

interface ApplyApResult {
  sessionId: string; // the session actually applied
  reportPath: string; // where the report was (re)written
  entriesAppended: number; // session_ap + milestone_spend entries appended this run
  alreadyApplied: boolean; // true if both phases were no-ops
}

function calcFingerprint(sessionId: string, scribeIds: string[]): string {
  const sortedScribeIds = sortScribeIds(scribeIds);
  const fingerprintObj = { sessionId, scribeIds: sortedScribeIds };
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(fingerprintObj))
    .digest('hex');
}

/**
 * Phase-2 reconciler: read the session report's `milestoneAllocations[]`,
 * validate each against the (just-written or pre-existing) `session_ap` topup,
 * and append `milestone_spend` ledger entries. Idempotent by (character, sessionId).
 *
 * Strict-fail: if any staged allocation's pillar sum does not equal the computed
 * topup, the entire apply fails. The GM updates the staged allocation in the
 * report and re-runs apply.
 */
function reconcileMilestoneAllocations(
  reportPath: string,
  sessionId: SessionId,
): { appended: number } {
  if (!fs.existsSync(reportPath)) return { appended: 0 };
  const report = SessionReportSchema.parse(
    yaml.parse(fs.readFileSync(reportPath, 'utf8')),
  );
  const allocations: MilestoneAllocation[] = report.milestoneAllocations;
  if (allocations.length === 0) return { appended: 0 };

  const ledgerPath = REPO_PATHS.AP_LEDGER();
  const ledger: ApLedgerEntry[] = [];
  if (fs.existsSync(ledgerPath)) {
    for (const raw of readApLedger(ledgerPath)) {
      const parsed = ApLedgerEntrySchema.safeParse(raw);
      if (parsed.success) ledger.push(parsed.data);
    }
  }

  const newEntries: ApLedgerEntry[] = [];
  for (const alloc of allocations) {
    // Idempotency: skip if a milestone_spend already exists for this (character, session)
    const dup = ledger.find(
      (e) =>
        e.kind === 'milestone_spend' &&
        e.characterId === alloc.characterId &&
        e.sessionId === sessionId,
    );
    if (dup) continue;

    // Compute per-character pillar total from session_ap entries
    let pillarTotal = 0;
    for (const e of ledger) {
      if (
        e.kind === 'session_ap' &&
        e.characterId === alloc.characterId &&
        e.sessionId === sessionId
      ) {
        pillarTotal +=
          (e.advancementPoints.combat?.delta ?? 0) +
          (e.advancementPoints.exploration?.delta ?? 0) +
          (e.advancementPoints.social?.delta ?? 0);
      }
    }
    const topUp = Math.max(0, 3 - pillarTotal);
    const sum =
      alloc.pillarSplits.combat +
      alloc.pillarSplits.exploration +
      alloc.pillarSplits.social;

    if (sum !== topUp) {
      throw new Error(
        `Milestone allocation for "${alloc.characterId}" in ${sessionId} sums to ${sum}, ` +
          `but the topup is ${topUp} (session pillar AP = ${3 - topUp}). ` +
          `Edit milestoneAllocations[] in ${reportPath} and re-run \`weave apply ap ${sessionId}\`.`,
      );
    }

    const now = new Date().toISOString();
    newEntries.push({
      kind: 'milestone_spend',
      advancementPoints: {
        combat: { delta: alloc.pillarSplits.combat, reason: 'normal' },
        exploration: {
          delta: alloc.pillarSplits.exploration,
          reason: 'normal',
        },
        social: { delta: alloc.pillarSplits.social, reason: 'normal' },
      },
      appliedAt: now,
      characterId: alloc.characterId,
      sessionId,
      ...(alloc.note ? { notes: alloc.note } : {}),
    });
  }

  if (newEntries.length > 0) {
    appendApEntries(ledgerPath, newEntries);
  }
  return { appended: newEntries.length };
}

export async function applyAp(opts: ApplyApOptions): Promise<ApplyApResult> {
  let createdAt: string = '';
  let { sessionId } = opts;
  // Carry forward staged milestone allocations from the existing report (if any)
  // so they survive the planned→completed transition.
  let preservedMilestoneAllocations: MilestoneAllocation[] = [];

  // --- Get a Valid Session ID ---
  if (sessionId) {
    // Validate Session ID Format
    assertSessionId(sessionId);
    const paddedSessionNum = sessionId.split('-')[1];
    const allFiles = discoverFinalizedLogsForOrThrow(paddedSessionNum);

    // Sort Scribe IDs
    const unsortedScribeIds = allFiles.map((file) =>
      path.basename(file.filename, '.jsonl'),
    );
    const scribeIds = sortScribeIds(unsortedScribeIds);

    const reportPath = path.join(
      REPO_PATHS.REPORTS(),
      `session-${padSessionNum(paddedSessionNum)}.yaml`,
    );
    const fingerprint = calcFingerprint(sessionId, scribeIds);
    if (fs.existsSync(reportPath)) {
      const reportContent = fs.readFileSync(reportPath, 'utf8');
      let reportYaml;
      try {
        const reportYamlRaw = yaml.parse(reportContent);
        reportYaml = SessionReportSchema.parse(reportYamlRaw);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new SessionReportValidationError(sessionId, err.issues);
        }
        throw new Error(`Failed to parse report for ${sessionId}: ${err}`);
      }
      createdAt = reportYaml.createdAt ?? '';
      preservedMilestoneAllocations = reportYaml.milestoneAllocations;

      // Check for Existing Completed Report (idempotency Check)
      const existingStatus = reportYaml.status;
      const existingFingerprint =
        existingStatus === 'completed' ? reportYaml.fingerprint : undefined;

      if (existingFingerprint === fingerprint) {
        // Pillar-AP phase is a no-op (matching fingerprint), but milestone
        // allocations may have been staged after the prior apply — reconcile
        // them now so re-running apply commits any pending milestone_spend.
        const phase2 = reconcileMilestoneAllocations(reportPath, sessionId);
        return {
          sessionId,
          reportPath,
          entriesAppended: phase2.appended,
          alreadyApplied: phase2.appended === 0,
        } satisfies ApplyApResult;
      }

      if (existingStatus && existingStatus !== 'planned') {
        throw new SessionFingerprintMismatchError(sessionId);
      }
    }
  } else {
    // Discover finalized session logs
    const sessionNumbers = discoverFinalizedLogs().map(
      (log) => log.sessionNumber,
    );

    // Identify pending sessions
    const completedSessions = discoverCompletedReports();
    const pendingSessions = sessionNumbers.filter(
      (num) => !completedSessions.includes(num),
    );

    // Pick the next session to apply
    if (pendingSessions.length === 0) {
      throw new Error('No pending sessions with finalized logs found.');
    }
    sessionId = pickNextSessionId(completedSessions, pendingSessions);
  }

  const paddedSessionNum = sessionId.split('-')[1];

  // --- Discover Scribe IDs (Finalized Logs) ---
  const allFiles = discoverFinalizedLogsForOrThrow(paddedSessionNum);

  // Scribe IDs sorted
  const unsortedScribeIds = allFiles.map((file) =>
    path.basename(file.filename, '.jsonl'),
  );
  const scribeIds = sortScribeIds(unsortedScribeIds);

  // --- Parse All Parts ---
  const events = readAllFinalizedLogsForSession(paddedSessionNum);

  // --- Validate Events ---
  if (!events || events.length === 0) {
    throw new Error(
      `No events found for session ${sessionId}. The finalized log may be corrupted or empty.`,
    );
  }

  // --- Derive Session Fields ---
  const gameStartDate = formatDate(firstCalendarDate(events));
  const gameEndDate = formatDate(lastCalendarDate(events));
  const notes = (eventsOf(events, 'note') as NoteEvent[]).map(
    (e) => e.payload.text,
  );

  // --- Build Todo List ---
  // Read template items
  const templatePath = path.join(
    REPO_PATHS.TEMPLATES(),
    'post-session-checklist.yaml',
  );
  let templateTodos: TodoItem[] = [];
  if (fs.existsSync(templatePath)) {
    const template = yaml.parse(fs.readFileSync(templatePath, 'utf8'));
    templateTodos = (template.items || []).map(
      (item: { text: string }) =>
        ({
          text: item.text,
          status: 'pending',
          source: 'template',
        }) satisfies TodoItem,
    );
  }

  // Convert scribe todos to object format
  const scribeTodos: TodoItem[] = (eventsOf(events, 'todo') as TodoEvent[]).map(
    (e) =>
      ({
        text: e.payload.text,
        status: 'pending',
        source: 'scribe',
      }) satisfies TodoItem,
  );

  // Combine: template items first, then scribe items
  const todos: TodoItem[] = [...templateTodos, ...scribeTodos];

  // Get session date from session_start event
  const sessionStartEvent = events.find((e) => e.kind === 'session_start');
  if (!sessionStartEvent || !sessionStartEvent.payload?.sessionDate) {
    throw new Error(
      `Cannot determine session date for ${sessionId}: session_start event missing or has no sessionDate.`,
    );
  }
  const sessionDate = sessionStartEvent.payload.sessionDate;

  // --- Derive Attendance ---
  const party = selectParty(events);
  // Filter out guest PCs - they don't accumulate AP in the ledger
  const regularCharacters = party.filter(
    (member) => !isGuest(member),
  ) as string[];

  // --- Build characterLevels map ---
  const characterLevels: Record<string, number> = {};
  for (const characterId of regularCharacters) {
    let level = 1;
    try {
      const charPathYaml = path.join(
        REPO_PATHS.CHARACTERS(),
        `${characterId}.yaml`,
      );
      const charPathYml = path.join(
        REPO_PATHS.CHARACTERS(),
        `${characterId}.yml`,
      );
      const charPath = fs.existsSync(charPathYaml) ? charPathYaml : charPathYml;
      if (fs.existsSync(charPath)) {
        const charYaml = yaml.parse(fs.readFileSync(charPath, 'utf8'));
        if (typeof charYaml.level === 'number') {
          level = charYaml.level;
        }
      }
    } catch {
      level = 1;
    }
    characterLevels[characterId] = level;
  }

  // --- Compute AP results ---
  const { reportAdvancementPoints, ledgerResults } = computeApForSession(
    eventsOf(events, 'advancement_point'),
    characterLevels,
    paddedSessionNum,
  );

  // --- Write Outputs & Return Shape ---
  const fingerprint = calcFingerprint(sessionId, scribeIds);

  // Write completed session report
  const reportPath = path.join(
    REPO_PATHS.REPORTS(),
    `session-${padSessionNum(paddedSessionNum)}.yaml`,
  );

  // In the auto-discovery path we did not read the existing report at the top,
  // so re-read it here to preserve any staged milestone allocations.
  if (
    preservedMilestoneAllocations.length === 0 &&
    fs.existsSync(reportPath)
  ) {
    try {
      const existing = SessionReportSchema.parse(
        yaml.parse(fs.readFileSync(reportPath, 'utf8')),
      );
      preservedMilestoneAllocations = existing.milestoneAllocations;
      if (createdAt.length === 0) {
        createdAt = existing.createdAt ?? '';
      }
    } catch {
      // ignore — the new write below will produce a valid report
    }
  }

  const now = new Date().toISOString();
  const reportOut = {
    id: sessionId,
    advancementPoints: reportAdvancementPoints,
    characterIds: regularCharacters, // Only regular PCs tracked for AP (guests filtered out)
    fingerprint,
    gameEndDate,
    gameStartDate,
    milestoneAllocations: preservedMilestoneAllocations,
    notes,
    todo: todos,
    schemaVersion: 2,
    scribeIds,
    sessionDate,
    source: 'scribe',
    status: 'completed',
    weave: {
      appliedAt: now,
      version: pkg.version,
    },
    createdAt: createdAt.length === 0 ? now : createdAt,
    updatedAt: now,
  };
  writeYamlAtomic(reportPath, reportOut);

  // Append per-character session_ap entries to the ledger
  const entries = buildSessionApEntries(ledgerResults, {
    appliedAt: now,
    sessionId,
    fingerprint,
  });
  appendApEntries(REPO_PATHS.AP_LEDGER(), entries);

  // Phase 2: reconcile milestone allocations into the ledger
  const phase2 = reconcileMilestoneAllocations(reportPath, sessionId);

  return {
    sessionId,
    reportPath,
    entriesAppended: entries.length + phase2.appended,
    alreadyApplied: false,
  } satisfies ApplyApResult;
}

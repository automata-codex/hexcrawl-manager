import fs from 'node:fs';
import path from 'node:path';

import {
  REPO_PATHS,
  readApLedger,
  writeYamlAtomic,
} from '@achm/data';
import {
  ApLedgerEntrySchema,
  MilestoneAllocation,
  Pillar,
  SessionReport,
  SessionReportSchema,
  isSessionId,
  padSessionNum,
} from '@achm/schemas';
import yaml from 'yaml';

import { CliValidationError, IoApplyError } from '../lib/errors';
import { ensureCharacterExists } from '../lib/validate';

import type { AllocateMilestoneArgs } from './allocate';

export const MILESTONE_AP_CAP = 3;

export type AllocateMilestoneResult = {
  characterId: string;
  sessionId: string;
  pillars: { combat?: number; exploration?: number; social?: number };
  amount: number; // sum of pillar splits — varies by topup
  topUpAmount: number | null; // null when deferred (no session_ap yet)
  note?: string;
  allocatedAt: string;
  dryRun: boolean;
};

function loadSessionReport(sessionId: string): {
  report: SessionReport;
  reportPath: string;
} {
  const num = sessionId.split('-')[1];
  const reportPath = path.join(
    REPO_PATHS.REPORTS(),
    `session-${padSessionNum(num)}.yaml`,
  );
  if (!fs.existsSync(reportPath)) {
    throw new CliValidationError(
      `Session report not found for ${sessionId} (expected ${reportPath}).`,
    );
  }
  const raw = fs.readFileSync(reportPath, 'utf8');
  const parsed = SessionReportSchema.safeParse(yaml.parse(raw));
  if (!parsed.success) {
    throw new CliValidationError(
      `Session report for ${sessionId} failed schema validation: ${parsed.error.message}`,
    );
  }
  return { report: parsed.data, reportPath };
}

function getEagerTopUp(
  characterId: string,
  sessionId: string,
): number | null {
  const ledgerPath = REPO_PATHS.AP_LEDGER();
  if (!fs.existsSync(ledgerPath)) return null;
  const entries = readApLedger(ledgerPath);

  let pillarTotal = 0;
  let foundSessionAp = false;
  for (const raw of entries) {
    const parsed = ApLedgerEntrySchema.safeParse(raw);
    if (!parsed.success) continue;
    const entry = parsed.data;
    if (
      entry.kind === 'session_ap' &&
      entry.characterId === characterId &&
      entry.sessionId === sessionId
    ) {
      foundSessionAp = true;
      pillarTotal +=
        (entry.advancementPoints.combat?.delta ?? 0) +
        (entry.advancementPoints.exploration?.delta ?? 0) +
        (entry.advancementPoints.social?.delta ?? 0);
    }
  }

  if (!foundSessionAp) return null;
  return Math.max(0, MILESTONE_AP_CAP - pillarTotal);
}

function validatePillarSplits(
  splits: Partial<Record<Pillar, number>> | undefined,
): { combat: number; exploration: number; social: number; sum: number } {
  if (!splits) {
    throw new CliValidationError(
      'Pillar splits are required: --combat/--exploration/--social.',
    );
  }
  const combat = splits.combat ?? 0;
  const exploration = splits.exploration ?? 0;
  const social = splits.social ?? 0;
  for (const [flag, v] of [
    ['--combat', combat],
    ['--exploration', exploration],
    ['--social', social],
  ] as const) {
    if (!Number.isInteger(v) || v < 0) {
      throw new CliValidationError(
        `Expected a non-negative integer for ${flag}.`,
      );
    }
  }
  const sum = combat + exploration + social;
  if (sum < 0 || sum > MILESTONE_AP_CAP) {
    throw new CliValidationError(
      `Milestone pillar splits must sum to between 0 and ${MILESTONE_AP_CAP}; got ${sum}.`,
    );
  }
  return { combat, exploration, social, sum };
}

export async function allocateMilestone(
  args: AllocateMilestoneArgs,
): Promise<AllocateMilestoneResult> {
  const { characterId, sessionId, pillarSplits, note, dryRun = false } = args;

  if (!characterId) {
    throw new CliValidationError('characterId is required.');
  }
  if (!sessionId) {
    throw new CliValidationError(
      '--session-id is required for milestone allocation.',
    );
  }
  if (!isSessionId(sessionId)) {
    throw new CliValidationError(`Invalid session ID: "${sessionId}".`);
  }
  await ensureCharacterExists(characterId);

  const splits = validatePillarSplits(pillarSplits);

  // Load report and check dedup
  const { report, reportPath } = loadSessionReport(sessionId);
  const existing = report.milestoneAllocations.find(
    (a) => a.characterId === characterId,
  );
  if (existing) {
    throw new CliValidationError(
      `Milestone allocation for character "${characterId}" already exists in ${sessionId}. ` +
        `To revise, edit ${reportPath} by hand.`,
    );
  }

  // Eager top-up validation when session_ap is already in the ledger
  const topUp = getEagerTopUp(characterId, sessionId);
  if (topUp !== null && splits.sum !== topUp) {
    throw new CliValidationError(
      `Milestone pillar splits for "${characterId}" must sum to ${topUp} ` +
        `(session pillar AP = ${MILESTONE_AP_CAP - topUp}); got ${splits.sum}.`,
    );
  }

  const allocatedAt = new Date().toISOString();
  const allocation: MilestoneAllocation = {
    characterId,
    pillarSplits: {
      combat: splits.combat,
      exploration: splits.exploration,
      social: splits.social,
    },
    ...(note ? { note } : {}),
    allocatedAt,
  };

  if (!dryRun) {
    try {
      const updated: SessionReport = {
        ...report,
        milestoneAllocations: [...report.milestoneAllocations, allocation],
      };
      writeYamlAtomic(reportPath, updated);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new IoApplyError(
        `Failed to stage milestone allocation in ${reportPath}: ${msg}`,
      );
    }
  }

  return {
    characterId,
    sessionId,
    pillars: {
      combat: splits.combat,
      exploration: splits.exploration,
      social: splits.social,
    },
    amount: splits.sum,
    topUpAmount: topUp,
    note,
    allocatedAt,
    dryRun,
  } satisfies AllocateMilestoneResult;
}

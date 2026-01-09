import {
  REPO_PATHS,
  appendApEntry,
  findLastCompletedSessionSeq,
} from '@achm/data';
import { ApLedgerEntry, makeSessionId } from '@achm/schemas';

import { CliValidationError, IoApplyError } from '../lib/errors';
import {
  assertNonNegativeInt,
  ensureCharacterExists,
} from '../lib/validate';

import type { AllocateMilestoneArgs } from './allocate';

export type AllocateMilestoneResult = {
  characterId: string;
  amount: number; // always 3
  pillars: { combat?: number; exploration?: number; social?: number };
  sessionIdSpentAt: string;
  note?: string;
  createdAt: string;
  dryRun: boolean;
};

export const MILESTONE_AP_AMOUNT = 3;

function buildMilestoneSpendEntry(
  args: AllocateMilestoneArgs,
  latestSessionNum: number,
  createdAt: string,
): ApLedgerEntry {
  return {
    kind: 'milestone_spend',
    advancementPoints: {
      combat: {
        delta: args.pillarSplits?.combat ?? 0,
        reason: 'normal',
      },
      exploration: {
        delta: args.pillarSplits?.exploration ?? 0,
        reason: 'normal',
      },
      social: {
        delta: args.pillarSplits?.social ?? 0,
        reason: 'normal',
      },
    },
    appliedAt: createdAt,
    characterId: args.characterId,
    notes: args.note ?? '',
    sessionId: makeSessionId(latestSessionNum),
  };
}

function validateMilestonePillarSplits(
  splits?: Partial<Record<'combat' | 'exploration' | 'social', number>>,
) {
  if (!splits) {
    throw new CliValidationError(
      `Pillar splits are required: --combat/--exploration/--social must sum to ${MILESTONE_AP_AMOUNT}.`,
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
    assertNonNegativeInt(flag, v);
  }

  const sum = combat + exploration + social;
  if (sum !== MILESTONE_AP_AMOUNT) {
    throw new CliValidationError(
      `Pillar splits must sum to ${MILESTONE_AP_AMOUNT}; got ${sum}.`,
    );
  }
}

export async function allocateMilestone(
  args: AllocateMilestoneArgs,
): Promise<AllocateMilestoneResult> {
  const { characterId, pillarSplits, note, dryRun = false } = args;

  if (!characterId) {
    throw new CliValidationError('characterId is required.');
  }
  validateMilestonePillarSplits(pillarSplits);
  await ensureCharacterExists(characterId);

  const latestSessionNum = findLastCompletedSessionSeq();
  if (!latestSessionNum) {
    throw new CliValidationError(
      'No finalized sessions found (latest completed session is required).',
    );
  }

  // No credit check for milestones - GM grants them directly

  const createdAt = new Date().toISOString();
  const entry = buildMilestoneSpendEntry(args, latestSessionNum, createdAt);

  if (!dryRun) {
    try {
      appendApEntry(REPO_PATHS.AP_LEDGER(), entry);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new IoApplyError(
        `Failed to append milestone_spend to AP ledger: ${msg}`,
      );
    }
  }

  return {
    characterId,
    amount: MILESTONE_AP_AMOUNT,
    pillars: {
      ...(pillarSplits?.combat != null ? { combat: pillarSplits.combat } : {}),
      ...(pillarSplits?.exploration != null
        ? { exploration: pillarSplits.exploration }
        : {}),
      ...(pillarSplits?.social != null ? { social: pillarSplits.social } : {}),
    },
    sessionIdSpentAt: makeSessionId(latestSessionNum),
    note,
    createdAt,
    dryRun,
  };
}

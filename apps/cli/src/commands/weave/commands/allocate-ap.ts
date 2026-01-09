import {
  REPO_PATHS,
  appendApEntry,
  findLastCompletedSessionSeq,
} from '@achm/data';
import { ApLedgerEntry, makeSessionId } from '@achm/schemas';

import {
  CliValidationError,
  InsufficientCreditsError,
  IoApplyError,
} from '../lib/errors';
import {
  assertPositiveInt,
  ensureCharacterExists,
} from '../lib/validate';

import { statusAp } from './status-ap';

import type { AllocateArgs } from './allocate';

export type AllocateApResult = {
  characterId: string;
  amount: number;
  pillars: { combat?: number; exploration?: number; social?: number };
  sessionIdSpentAt: string;
  availableBefore: number;
  availableAfter: number;
  note?: string;
  createdAt: string;
  dryRun: boolean;
};

async function getAvailableAbsenceCredits(
  characterId: string,
): Promise<number> {
  const { absenceAwards } = await statusAp();
  const row = absenceAwards.find((r) => r.characterId === characterId);
  return row?.unclaimed ?? 0;
}

// Helper: Build AP ledger entry
function buildAbsenceSpendEntry(
  args: AllocateArgs,
  latestSessionNum: number,
  createdAt: string,
): ApLedgerEntry {
  return {
    kind: 'absence_spend',
    advancementPoints: {
      combat: {
        delta: args.pillarSplits?.combat ?? 0,
        reason: 'absence_spend',
      },
      exploration: {
        delta: args.pillarSplits?.exploration ?? 0,
        reason: 'absence_spend',
      },
      social: {
        delta: args.pillarSplits?.social ?? 0,
        reason: 'absence_spend',
      },
    },
    appliedAt: createdAt,
    characterId: args.characterId,
    notes: args.note ?? '',
    sessionId: makeSessionId(latestSessionNum),
  };
}

// Helper: Validate pillar splits
function validatePillarSplits(
  amount: number,
  splits?: Partial<Record<'combat' | 'exploration' | 'social', number>>,
) {
  if (!splits) {
    throw new CliValidationError(
      'Pillar splits are required: --combat/--exploration/--social must sum to --amount.',
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
  if (sum !== amount) {
    throw new CliValidationError(
      `Pillar splits must sum to amount (${amount}); got ${sum}.`,
    );
  }
}

export async function allocateAp(
  args: AllocateArgs,
): Promise<AllocateApResult> {
  // Step 1: Parse and validate input
  const { characterId, amount, pillarSplits, note, dryRun = false } = args;

  if (!characterId) {
    throw new CliValidationError('characterId is required.');
  }
  assertPositiveInt('amount', amount);
  validatePillarSplits(amount, pillarSplits);
  await ensureCharacterExists(characterId);

  const latestSessionNum = findLastCompletedSessionSeq();
  if (!latestSessionNum) {
    throw new CliValidationError(
      'No finalized sessions found (latest completed session is required).',
    );
  }

  // Step 2: Ensure the character actually has enough unspent Tier-1 credits
  const availableBefore = await getAvailableAbsenceCredits(characterId);
  if (availableBefore < amount) {
    throw new InsufficientCreditsError(characterId, availableBefore, amount);
  }

  // Step 3: Prepare AP allocation data
  const createdAt = new Date().toISOString();
  const entry = buildAbsenceSpendEntry(args, latestSessionNum, createdAt);

  // Step 4: Apply AP allocation (unless dryRun)
  if (!dryRun) {
    try {
      appendApEntry(REPO_PATHS.AP_LEDGER(), entry);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new IoApplyError(
        `Failed to append absence_spend to AP ledger: ${msg}`,
      );
    }
  }

  return {
    characterId,
    amount,
    pillars: {
      ...(pillarSplits?.combat != null ? { combat: pillarSplits.combat } : {}),
      ...(pillarSplits?.exploration != null
        ? { exploration: pillarSplits.exploration }
        : {}),
      ...(pillarSplits?.social != null ? { social: pillarSplits.social } : {}),
    },
    sessionIdSpentAt: makeSessionId(latestSessionNum),
    availableBefore,
    availableAfter: availableBefore - amount,
    note,
    createdAt,
    dryRun,
  } satisfies AllocateApResult;
}

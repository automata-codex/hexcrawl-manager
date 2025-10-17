import { error, info } from '@skyreach/cli-kit';
import { REPO_PATHS, getLatestSessionNumber } from '@skyreach/data';
import { ApLedgerEntry, makeSessionId } from '@skyreach/schemas';

import { appendApEntry } from '../../../services/ap-ledger.service';

import type { AllocateArgs } from './allocate';

// Helper: Build AP ledger entry
function buildAbsenceSpendEntry(args: AllocateArgs): ApLedgerEntry {
  const latestSessionNum = getLatestSessionNumber();
  if (latestSessionNum === undefined) {
    throw new Error('No finalized sessions found.');
  }

  return {
    kind: 'absence_spend',
    advancementPoints: {
      combat: { delta: args.pillarSplits?.combat || 0 },
      exploration: { delta: args.pillarSplits?.exploration || 0 },
      social: { delta: args.pillarSplits?.social || 0 },
    },
    appliedAt: new Date().toISOString(),
    characterId: args.characterId,
    notes: args.note || '',
    sessionId: makeSessionId(latestSessionNum),
  };
}

// Helper: Validate pillar splits
function validatePillarSplits(amount: number, splits?: Partial<Record<string, number>>) {
  if (!splits) {
    throw new Error('Pillar splits are required.');
  }
  const sum = Object.values(splits).reduce((a, b) => (a ?? 0) + (b ?? 0), 0);
  if (sum !== amount) {
    throw new Error(`Pillar splits must sum to amount (${amount}), got ${sum}.`);
  }
}

export async function allocateAp(args: AllocateArgs) {
  // Step 1: Parse and validate input
  if (!args.characterId) {
    throw new Error('characterId is required.');
  }
  if (!args.amount || args.amount <= 0) {
    throw new Error('amount must be positive.');
  }
  validatePillarSplits(args.amount, args.pillarSplits);

  // Step 2: Prepare AP allocation data
  const entry = buildAbsenceSpendEntry(args);

  // Step 3: Apply AP allocation (unless dryRun)
  if (!args.dryRun) {
    appendApEntry(REPO_PATHS.AP_LEDGER(), entry);
    info(`AP allocation recorded for character ${args.characterId}`);
  } else {
    info(`[Dry run] Would record AP allocation for character ${args.characterId}`);
  }

  return {
    characterId: args.characterId,
    amount: args.amount,
    pillarSplits: args.pillarSplits || {},
    note: args.note || '',
    dryRun: !!args.dryRun,
    status: 'success',
  };
}

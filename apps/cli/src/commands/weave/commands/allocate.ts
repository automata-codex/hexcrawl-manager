import { error, info, makeExitMapper } from '@skyreach/cli-kit';
import { Pillar } from '@skyreach/schemas';

import {
  CliError,
  CliValidationError,
  InsufficientCreditsError,
  IoApplyError,
} from '../lib/errors';

import { allocateAp, AllocateApResult } from './allocate-ap';

export type AllocateArgs = {
  characterId: string;
  amount: number;
  pillarSplits?: Partial<Record<Pillar, number>>;
  note?: string;
  dryRun?: boolean;
};

export type AllocationBlock = {
  characterId: string;
  amount: number;
  note?: string;
  pillarSplits?: Partial<Record<Pillar, number>>;
};

export const exitCodeForAllocate = makeExitMapper([
  [CliValidationError, 4],
  [InsufficientCreditsError, 6],
  [IoApplyError, 2],

  // Keep the most generic types at the end to avoid masking more specific ones
  [CliError, 1],
], 1);

/**
 * Single allocation (kept small and reusable/testable).
 */
export async function allocate(args: AllocateArgs): Promise<AllocateApResult> {
  try {
    return allocateAp(args);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    error(message);
    process.exit(exitCodeForAllocate(err));
  }
}

/**
 * End-to-end entry point used by the CLI layer.
 */
export async function allocateFromCli(rawArgs: string[], dryRun: boolean) {
  const tokens = sliceAfterWeaveAllocateAp(rawArgs);
  const blocks = parseAllocateTokens(tokens);
  await allocateMany(blocks, dryRun);
}

/**
 * Execute many allocations. If one throws, exit is handled by `allocate()`.
 */
export async function allocateMany(blocks: AllocationBlock[], dryRun: boolean) {
  const results: AllocateApResult[] = [];
  for (const blk of blocks) {
    const result = await allocate({
      characterId: blk.characterId,
      amount: blk.amount,
      note: blk.note,
      pillarSplits: blk.pillarSplits,
      dryRun,
    });
    results.push(result);
  }
  printAllocateResults(results);
}

/**
 * Parse the CLI tokens that follow `weave allocate ap`
 * into one or more allocation blocks.
 *
 * Rules:
 * - Each `--character <id>` starts a new block (required per block).
 * - `--amount <n>` is required per block; must be a non-negative integer.
 * - Optional splits: `--combat <n> --exploration <n> --social <n>`
 *   If any are present, their sum must equal `--amount` (each non-negative integer).
 * - `--note "<text>"` applies to the current block.
 * - `--dry-run` is global (handled by Commander).
 */
export function parseAllocateTokens(tokens: string[]): AllocationBlock[] {
  type Mutable = {
    characterId?: string;
    amount?: number;
    note?: string;
    splits: Partial<Record<Pillar, number>>;
  };

  const blocks: AllocationBlock[] = [];
  let current: Mutable | null = null;

  const isInt = (n: number) => Number.isInteger(n) && n >= 0;

  const finalize = () => {
    if (!current) return;
    if (!current.characterId) throw new Error('Missing --character for an allocation block.');
    if (current.amount == null || !isInt(current.amount)) {
      throw new Error(`Missing or invalid --amount for character "${current.characterId}".`);
    }

    const { combat = 0, exploration = 0, social = 0 } = current.splits;
    const provided = [
      ['--combat', current.splits.combat],
      ['--exploration', current.splits.exploration],
      ['--social', current.splits.social],
      // eslint-disable-next-line no-unused-vars
    ].filter(([_, v]) => v != null) as Array<[string, number]>;

    // Validate each pillar when provided
    for (const [flag, v] of provided) {
      if (Number.isNaN(v) || !isInt(v)) {
        throw new Error(`Expected a non-negative integer for ${flag}.`);
      }
    }

    const sum = combat + exploration + social;
    if (provided.length > 0 && sum !== current.amount) {
      throw new Error(
        `Pillar split mismatch for "${current.characterId}": combat(${combat}) + exploration(${exploration}) + social(${social}) = ${sum}, but --amount is ${current.amount}.`
      );
    }

    const pillarSplits =
      provided.length > 0
        ? ({
          ...(current.splits.combat != null ? { combat } : {}),
          ...(current.splits.exploration != null ? { exploration } : {}),
          ...(current.splits.social != null ? { social } : {}),
        } as AllocationBlock['pillarSplits'])
        : undefined;

    blocks.push({
      characterId: current.characterId,
      amount: current.amount,
      note: current.note,
      pillarSplits,
    });

    current = null;
  };

  const take = (i: number) => {
    const v = tokens[i + 1];
    if (!v || v.startsWith('-')) throw new Error(`Expected a value after ${tokens[i]}.`);
    return v;
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    switch (t) {
      case '--character': {
        // Finish previous block and start a new one
        finalize();
        current = { splits: {} };
        current.characterId = take(i);
        i++;
        break;
      }

      case '--amount': {
        if (!current) current = { splits: {} };
        const n = Number(take(i));
        if (!isInt(n)) throw new Error('Expected a non-negative integer for --amount.');
        current.amount = n;
        i++;
        break;
      }

      case '--combat': {
        if (!current) current = { splits: {} };
        const n = Number(take(i));
        if (!isInt(n)) throw new Error('Expected a non-negative integer for --combat.');
        current.splits.combat = n;
        i++;
        break;
      }

      case '--exploration': {
        if (!current) current = { splits: {} };
        const n = Number(take(i));
        if (!isInt(n)) throw new Error('Expected a non-negative integer for --exploration.');
        current.splits.exploration = n;
        i++;
        break;
      }

      case '--social': {
        if (!current) current = { splits: {} };
        const n = Number(take(i));
        if (!isInt(n)) throw new Error('Expected a non-negative integer for --social.');
        current.splits.social = n;
        i++;
        break;
      }

      case '--note': {
        if (!current) current = { splits: {} };
        current.note = take(i);
        i++;
        break;
      }

      // Ignore anything else here; Commander handles globals like --dry-run
      default:
        break;
    }
  }

  // Push last block
  finalize();

  if (blocks.length === 0) {
    throw new Error(
      'No allocations found.\n' +
      'Usage:\n' +
      '  weave allocate ap --character <id> --amount <n> [--combat <n>] [--exploration <n>] [--social <n>] [--note "..."]\n' +
      '  (repeat --character/--amount/... to allocate for multiple characters)'
    );
  }

  return blocks;
}

// Pretty-printer for one or many results
function printAllocateResults(results: AllocateApResult[]) {
  if (results.length === 0) return;

  const dryRun = results.some(r => r.dryRun);
  const headers = [
    'characterId',
    'amount',
    'pillars (c/e/s)',
    'sessionIdSpentAt',
    'available(before→after)',
    'note',
  ];

  const rows = results.map((r) => {
    const c = r.pillars.combat ?? 0;
    const e = r.pillars.exploration ?? 0;
    const s = r.pillars.social ?? 0;
    return [
      r.characterId,
      String(r.amount),
      `${c}/${e}/${s}`,
      r.sessionIdSpentAt,
      `${r.availableBefore}→${r.availableAfter}`,
      r.note ?? '',
    ];
  });

  // compute column widths
  const widths = headers.map((h, idx) =>
    Math.max(
      h.length,
      ...rows.map((row) => (row[idx] ?? '').length),
    ),
  );

  const pad = (str: string, w: number) => str.padEnd(w, ' ');

  const line = (cols: string[]) =>
    cols.map((c, i) => pad(c, widths[i])).join('   '); // 3 spaces between cols

  // header
  info(
    (dryRun ? '[DRY RUN] ' : '') +
    line(headers),
  );
  // separator
  info(line(widths.map((w) => '-'.repeat(w))));

  // rows
  for (const r of rows) {
    info(line(r));
  }
}


/**
 * Slice raw argv to the tokens after `weave allocate ap`.
 * (Commander layer also carries a local copy to print help early.)
 */
export function sliceAfterWeaveAllocateAp(rawArgs: string[]): string[] {
  const iWeave = rawArgs.findIndex((t) => t === 'weave');
  if (iWeave === -1) return [];
  const iAllocate = rawArgs.slice(iWeave + 1).findIndex((t) => t === 'allocate');
  if (iAllocate === -1) return [];
  const iAp = rawArgs.slice(iWeave + 1 + iAllocate + 1).findIndex((t) => t === 'ap');
  if (iAp === -1) return [];
  const start = iWeave + 1 + iAllocate + 1 + iAp + 1;
  return rawArgs.slice(start);
}

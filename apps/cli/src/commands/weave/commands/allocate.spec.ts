import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  parseAllocateTokens,
  parseMilestoneTokens,
  sliceAfterWeaveAllocateAp,
  sliceAfterWeaveAllocateApSubcommand,
  allocateFromCli,
  allocateMilestoneFromCli,
  type AllocationBlock,
  type MilestoneAllocationBlock,
} from './allocate';
import { AllocateApResult } from './allocate-ap';
import { AllocateMilestoneResult } from './allocate-ap-milestone';

// Mock cli-kit logging + exit mapper (no-op / deterministic)
vi.mock('@achm/cli-kit', () => ({
  info: vi.fn(),
  error: vi.fn(),
  makeExitMapper: () => () => 1,
}));

// Mock allocate-ap; we'll assert on calls in E2E test
const allocateApMock = vi
  // eslint-disable-next-line no-unused-vars
  .fn(async (..._rest): Promise<AllocateApResult> => {
    return {
      amount: 0,
      availableAfter: 0,
      availableBefore: 0,
      characterId: '',
      createdAt: '',
      dryRun: true,
      note: '',
      pillars: {},
      sessionIdSpentAt: '',
    };
  });
vi.mock('./allocate-ap', () => ({
  allocateAp: (...args: unknown[]) => allocateApMock(...args),
}));

// Mock allocate-ap-milestone
const allocateMilestoneMock = vi
  // eslint-disable-next-line no-unused-vars
  .fn(async (..._rest): Promise<AllocateMilestoneResult> => {
    return {
      amount: 3,
      characterId: '',
      createdAt: '',
      dryRun: true,
      note: '',
      pillars: {},
      sessionIdSpentAt: '',
    };
  });
vi.mock('./allocate-ap-milestone', () => ({
  allocateMilestone: (...args: unknown[]) => allocateMilestoneMock(...args),
  MILESTONE_AP_AMOUNT: 3,
}));

beforeEach(() => {
  allocateApMock.mockReset();
  allocateMilestoneMock.mockReset();
});

describe('parseAllocateTokens', () => {
  it('parses a single block with explicit pillar splits matching amount', () => {
    const tokens = [
      '--character',
      'char-1',
      '--amount',
      '3',
      '--combat',
      '1',
      '--exploration',
      '2',
      '--note',
      'Missed 0021',
    ];
    const blocks = parseAllocateTokens(tokens);
    expect(blocks).toEqual<AllocationBlock[]>([
      {
        characterId: 'char-1',
        amount: 3,
        note: 'Missed 0021',
        pillarSplits: { combat: 1, exploration: 2 },
      },
    ]);
  });

  it('parses a single block with amount only (no splits)', () => {
    const tokens = ['--character', 'alpha', '--amount', '5'];
    const blocks = parseAllocateTokens(tokens);
    expect(blocks).toEqual<AllocationBlock[]>([
      {
        characterId: 'alpha',
        amount: 5,
        note: undefined,
        pillarSplits: undefined,
      },
    ]);
  });

  it('parses multiple blocks, each with their own fields', () => {
    const tokens = [
      '--character',
      'c1',
      '--amount',
      '2',
      '--social',
      '2',
      '--note',
      'make-up credit',

      '--character',
      'c2',
      '--amount',
      '1',
      '--exploration',
      '1',
    ];
    const blocks = parseAllocateTokens(tokens);
    expect(blocks).toEqual<AllocationBlock[]>([
      {
        characterId: 'c1',
        amount: 2,
        note: 'make-up credit',
        pillarSplits: { social: 2 },
      },
      {
        characterId: 'c2',
        amount: 1,
        note: undefined,
        pillarSplits: { exploration: 1 },
      },
    ]);
  });

  it('accepts zero values (e.g., amount 0, split 0) without error', () => {
    const tokens = [
      '--character',
      'c0',
      '--amount',
      '0',
      '--combat',
      '0',
      '--exploration',
      '0',
      '--social',
      '0',
    ];
    const blocks = parseAllocateTokens(tokens);
    expect(blocks).toEqual<AllocationBlock[]>([
      {
        characterId: 'c0',
        amount: 0,
        note: undefined,
        pillarSplits: { combat: 0, exploration: 0, social: 0 },
      },
    ]);
  });
});

describe('sliceAfterWeaveAllocateAp', () => {
  it('returns tokens after `weave allocate ap`', () => {
    const raw = [
      '/usr/local/bin/node',
      '/path/to/cli.js',
      'weave',
      'allocate',
      'ap',
      '--character',
      'x',
      '--amount',
      '1',
    ];
    const tokens = sliceAfterWeaveAllocateAp(raw);
    expect(tokens).toEqual(['--character', 'x', '--amount', '1']);
  });

  it('returns [] if `weave allocate ap` not found', () => {
    const raw = ['node', 'cli.js', 'weave', 'status'];
    const tokens = sliceAfterWeaveAllocateAp(raw);
    expect(tokens).toEqual([]);
  });
});

describe('allocateFromCli', () => {
  it('parses two blocks and calls allocateAp for each with dryRun=true', async () => {
    const raw = [
      'node',
      'cli.js',
      'weave',
      'allocate',
      'ap',
      '--character',
      'id1',
      '--amount',
      '2',
      '--social',
      '2',
      '--note',
      'absence credit',

      '--character',
      'id2',
      '--amount',
      '3',
      '--combat',
      '1',
      '--exploration',
      '2',
    ];

    await allocateFromCli(raw, /* dryRun */ true);

    // Two calls
    expect(allocateApMock).toHaveBeenCalledTimes(2);

    // First block
    expect(allocateApMock).toHaveBeenNthCalledWith(1, {
      characterId: 'id1',
      amount: 2,
      note: 'absence credit',
      pillarSplits: { social: 2 },
      dryRun: true,
    });

    // Second block
    expect(allocateApMock).toHaveBeenNthCalledWith(2, {
      characterId: 'id2',
      amount: 3,
      note: undefined,
      pillarSplits: { combat: 1, exploration: 2 },
      dryRun: true,
    });
  });

  it('handles amount-only (no splits) blocks', async () => {
    const raw = [
      'node',
      'cli.js',
      'weave',
      'allocate',
      'ap',
      '--character',
      'solo',
      '--amount',
      '4',
    ];

    await allocateFromCli(raw, false);

    expect(allocateApMock).toHaveBeenCalledTimes(1);
    expect(allocateApMock).toHaveBeenCalledWith({
      characterId: 'solo',
      amount: 4,
      note: undefined,
      pillarSplits: undefined,
      dryRun: false,
    });
  });
});

// ---- Milestone allocation tests ----

describe('parseMilestoneTokens', () => {
  it('parses a single block with pillar splits summing to 3', () => {
    const tokens = [
      '--character',
      'char-1',
      '--combat',
      '1',
      '--exploration',
      '1',
      '--social',
      '1',
      '--note',
      'Winter survival',
    ];
    const blocks = parseMilestoneTokens(tokens);
    expect(blocks).toEqual<MilestoneAllocationBlock[]>([
      {
        characterId: 'char-1',
        note: 'Winter survival',
        pillarSplits: { combat: 1, exploration: 1, social: 1 },
      },
    ]);
  });

  it('parses a block with uneven pillar distribution', () => {
    const tokens = [
      '--character',
      'alpha',
      '--combat',
      '0',
      '--exploration',
      '3',
      '--social',
      '0',
    ];
    const blocks = parseMilestoneTokens(tokens);
    expect(blocks).toEqual<MilestoneAllocationBlock[]>([
      {
        characterId: 'alpha',
        note: undefined,
        pillarSplits: { combat: 0, exploration: 3, social: 0 },
      },
    ]);
  });

  it('parses multiple blocks', () => {
    const tokens = [
      '--character',
      'c1',
      '--combat',
      '1',
      '--exploration',
      '2',
      '--social',
      '0',
      '--note',
      'Dragon quest',

      '--character',
      'c2',
      '--combat',
      '0',
      '--exploration',
      '1',
      '--social',
      '2',
    ];
    const blocks = parseMilestoneTokens(tokens);
    expect(blocks).toEqual<MilestoneAllocationBlock[]>([
      {
        characterId: 'c1',
        note: 'Dragon quest',
        pillarSplits: { combat: 1, exploration: 2, social: 0 },
      },
      {
        characterId: 'c2',
        note: undefined,
        pillarSplits: { combat: 0, exploration: 1, social: 2 },
      },
    ]);
  });

  it('throws if pillar splits do not sum to 3', () => {
    const tokens = [
      '--character',
      'bad',
      '--combat',
      '1',
      '--exploration',
      '1',
      '--social',
      '0',
    ];
    expect(() => parseMilestoneTokens(tokens)).toThrow(
      /must sum to 3.*got 2/,
    );
  });

  it('throws if no character is provided', () => {
    const tokens = ['--combat', '1', '--exploration', '1', '--social', '1'];
    expect(() => parseMilestoneTokens(tokens)).toThrow(/Missing --character/);
  });

  it('throws if no allocations are found', () => {
    const tokens: string[] = [];
    expect(() => parseMilestoneTokens(tokens)).toThrow(/No allocations found/);
  });
});

describe('sliceAfterWeaveAllocateApSubcommand', () => {
  it('returns tokens after `weave allocate ap absence`', () => {
    const raw = [
      '/usr/local/bin/node',
      '/path/to/cli.js',
      'weave',
      'allocate',
      'ap',
      'absence',
      '--character',
      'x',
      '--amount',
      '1',
    ];
    const tokens = sliceAfterWeaveAllocateApSubcommand(raw, 'absence');
    expect(tokens).toEqual(['--character', 'x', '--amount', '1']);
  });

  it('returns tokens after `weave allocate ap milestone`', () => {
    const raw = [
      'node',
      'cli.js',
      'weave',
      'allocate',
      'ap',
      'milestone',
      '--character',
      'y',
      '--combat',
      '1',
    ];
    const tokens = sliceAfterWeaveAllocateApSubcommand(raw, 'milestone');
    expect(tokens).toEqual(['--character', 'y', '--combat', '1']);
  });

  it('returns [] if subcommand not found', () => {
    const raw = ['node', 'cli.js', 'weave', 'allocate', 'ap', '--character', 'z'];
    const tokens = sliceAfterWeaveAllocateApSubcommand(raw, 'milestone');
    expect(tokens).toEqual([]);
  });
});

describe('allocateMilestoneFromCli', () => {
  it('parses two blocks and calls allocateMilestone for each with dryRun=true', async () => {
    const raw = [
      'node',
      'cli.js',
      'weave',
      'allocate',
      'ap',
      'milestone',
      '--character',
      'id1',
      '--combat',
      '1',
      '--exploration',
      '1',
      '--social',
      '1',
      '--note',
      'Winter survival',

      '--character',
      'id2',
      '--combat',
      '0',
      '--exploration',
      '2',
      '--social',
      '1',
    ];

    await allocateMilestoneFromCli(raw, /* dryRun */ true);

    expect(allocateMilestoneMock).toHaveBeenCalledTimes(2);

    expect(allocateMilestoneMock).toHaveBeenNthCalledWith(1, {
      characterId: 'id1',
      note: 'Winter survival',
      pillarSplits: { combat: 1, exploration: 1, social: 1 },
      dryRun: true,
    });

    expect(allocateMilestoneMock).toHaveBeenNthCalledWith(2, {
      characterId: 'id2',
      note: undefined,
      pillarSplits: { combat: 0, exploration: 2, social: 1 },
      dryRun: true,
    });
  });
});

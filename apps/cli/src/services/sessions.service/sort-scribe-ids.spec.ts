import { describe, it, expect } from 'vitest';

import { sortScribeIds } from './sort-scribe-ids';

describe('sortScribeIds', () => {
  it('sorts by date ascending, then suffix', () => {
    const ids = [
      'session-0021a_2025-09-17.jsonl',
      'session-0021_2025-09-17.jsonl',
      'session-0021b_2025-09-17.jsonl',
      'session-0021_2025-09-16.jsonl',
      'session-0021a_2025-09-16.jsonl',
      'session-0021_2025-09-18.jsonl',
    ];
    expect(sortScribeIds(ids)).toEqual([
      'session-0021_2025-09-16.jsonl',
      'session-0021_2025-09-17.jsonl',
      'session-0021_2025-09-18.jsonl',
      'session-0021a_2025-09-16.jsonl',
      'session-0021a_2025-09-17.jsonl',
      'session-0021b_2025-09-17.jsonl',
    ]);
  });
  it('handles missing suffix', () => {
    const ids = [
      'session-0022_2025-09-19.jsonl',
      'session-0022a_2025-09-19.jsonl',
    ];
    expect(sortScribeIds(ids)).toEqual([
      'session-0022_2025-09-19.jsonl',
      'session-0022a_2025-09-19.jsonl',
    ]);
  });
  it('handles invalid format gracefully', () => {
    const ids = ['badfile.jsonl', 'session-0023_2025-09-20.jsonl'];
    expect(sortScribeIds(ids)).toEqual([
      'badfile.jsonl',
      'session-0023_2025-09-20.jsonl',
    ]);
  });
});

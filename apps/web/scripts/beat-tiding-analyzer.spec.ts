import { describe, it, expect } from 'vitest';

import {
  analyzeBeatTidingCoverage,
  collectLinkedBeatIds,
  formatCoverageReport,
  type CoverageBook,
} from './beat-tiding-analyzer.js';
import { type TidingsBeatFile } from './faction-tidings-analyzer.js';

const beat = (
  parentPlotlineSlug: string,
  slug: string,
  overrides: Partial<TidingsBeatFile> = {},
): TidingsBeatFile => ({
  slug,
  parentPlotlineSlug,
  title: slug,
  ...overrides,
});

const book = (
  name: string,
  rows: CoverageBook['rows'] = [],
  situational: CoverageBook['situational'] = [],
): CoverageBook => ({ name, rows, situational });

describe('collectLinkedBeatIds', () => {
  it('collects beat links from rolled and selectable rows', () => {
    const books = [
      book(
        'Kobolds',
        [
          {
            linkType: 'beat',
            linkId: 'thorn-and-thistle/the-frosthollow-gate',
          },
        ],
        [{ linkType: 'beat', linkId: 'milly-and-baz/the-way-in' }],
      ),
    ];
    expect(collectLinkedBeatIds(books)).toEqual(
      new Set([
        'thorn-and-thistle/the-frosthollow-gate',
        'milly-and-baz/the-way-in',
      ]),
    );
  });

  it('ignores rows with other link types or no link', () => {
    const books = [
      book('Kobolds', [
        { linkType: 'clue', linkId: 'some-clue' },
        { linkType: 'encounter', linkId: 'some-encounter' },
        {},
      ]),
    ];
    expect(collectLinkedBeatIds(books)).toEqual(new Set());
  });

  it('dedupes the same beat linked from multiple books', () => {
    const books = [
      book('Kobolds', [{ linkType: 'beat', linkId: 'p/b' }]),
      book('Bearfolk', [{ linkType: 'beat', linkId: 'p/b' }]),
    ];
    expect(collectLinkedBeatIds(books)).toEqual(new Set(['p/b']));
  });
});

describe('analyzeBeatTidingCoverage', () => {
  it('reports live beats with no tiding link as orphans', () => {
    const beats = [beat('p', 'covered'), beat('p', 'orphaned')];
    const books = [book('K', [{ linkType: 'beat', linkId: 'p/covered' }])];
    const result = analyzeBeatTidingCoverage(beats, books);
    expect(result.liveBeatCount).toBe(2);
    expect(result.orphans).toEqual([
      { id: 'p/orphaned', title: 'orphaned', status: 'pending' },
    ]);
  });

  it('excludes non-live beats from the orphan check', () => {
    const beats = [
      beat('p', 'resolved', { status: 'resolved' }),
      beat('p', 'skipped', { status: 'skipped' }),
      beat('p', 'inactive', { campaignStatus: 'inactive' }),
      beat('p', 'live-active', { status: 'active' }),
    ];
    const result = analyzeBeatTidingCoverage(beats, []);
    expect(result.liveBeatCount).toBe(1);
    expect(result.orphans.map((o) => o.id)).toEqual(['p/live-active']);
  });

  it('matches on the compound id, not the bare slug', () => {
    const beats = [beat('plotline-a', 'shared-slug')];
    const books = [
      book('K', [{ linkType: 'beat', linkId: 'plotline-b/shared-slug' }]),
    ];
    const result = analyzeBeatTidingCoverage(beats, books);
    expect(result.orphans.map((o) => o.id)).toEqual(['plotline-a/shared-slug']);
  });

  it('sorts orphans by compound id', () => {
    const beats = [beat('zeta', 'b'), beat('alpha', 'b'), beat('alpha', 'a')];
    const result = analyzeBeatTidingCoverage(beats, []);
    expect(result.orphans.map((o) => o.id)).toEqual([
      'alpha/a',
      'alpha/b',
      'zeta/b',
    ]);
  });
});

describe('formatCoverageReport', () => {
  it('groups orphans by plotline with title and status', () => {
    const beats = [
      beat('milly-and-baz', 'the-way-in', {
        title: 'The Way In',
        status: 'active',
      }),
      beat('milly-and-baz', 'the-reunion', { title: 'The Reunion' }),
      beat('thorn-and-thistle', 'the-frosthollow-gate', {
        title: 'The Frosthollow Gate',
      }),
    ];
    const report = formatCoverageReport(analyzeBeatTidingCoverage(beats, []));
    expect(report).toContain(
      'Beat tiding coverage: 3 live beat(s), 0 beat link(s) in tidings, 3 orphan(s).',
    );
    expect(report).toContain('  Plotline: milly-and-baz');
    expect(report).toContain(
      '    - milly-and-baz/the-way-in  (The Way In)  [active]',
    );
    expect(report).toContain(
      '    - milly-and-baz/the-reunion  (The Reunion)  [pending]',
    );
    expect(report).toContain('  Plotline: thorn-and-thistle');
  });

  it('reports full coverage when there are no orphans', () => {
    const beats = [beat('p', 'b')];
    const books = [book('K', [{ linkType: 'beat', linkId: 'p/b' }])];
    const report = formatCoverageReport(
      analyzeBeatTidingCoverage(beats, books),
    );
    expect(report).toContain(
      '1 live beat(s), 1 beat link(s) in tidings, 0 orphan(s)',
    );
    expect(report).toContain(
      'All live beats are surfaced by at least one faction tiding.',
    );
  });
});

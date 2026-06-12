import { describe, it, expect } from 'vitest';

import {
  analyzeBeatTags,
  formatTagReport,
  parseBeatVocabulary,
  type BeatTagsFile,
} from './tags-analyzer.js';

const beat = (
  parentPlotlineSlug: string,
  slug: string,
  tags?: string[],
): BeatTagsFile => ({ slug, parentPlotlineSlug, tags });

describe('parseBeatVocabulary', () => {
  it('extracts the beat list from a keyed-by-domain document', () => {
    expect(parseBeatVocabulary({ beat: ['wilderness', 'social'] })).toEqual([
      'wilderness',
      'social',
    ]);
  });

  it('returns null when the beat key is missing', () => {
    expect(parseBeatVocabulary({ clue: ['x'] })).toBeNull();
  });

  it('returns null for a non-object document', () => {
    expect(parseBeatVocabulary(null)).toBeNull();
    expect(parseBeatVocabulary('beat')).toBeNull();
  });

  it('returns null when beat is not a list', () => {
    expect(parseBeatVocabulary({ beat: 'wilderness' })).toBeNull();
  });

  it('drops non-string entries', () => {
    expect(parseBeatVocabulary({ beat: ['wilderness', 7, null] })).toEqual([
      'wilderness',
    ]);
  });
});

describe('analyzeBeatTags', () => {
  const vocabulary = new Set(['wilderness', 'social']);

  it('flags off-vocabulary tags grouped by tag', () => {
    const beats = [
      beat('p1', 'a', ['wilderness', 'kobold-warren']),
      beat('p2', 'b', ['kobold-warren']),
    ];
    expect(analyzeBeatTags(beats, vocabulary)).toEqual([
      { tag: 'kobold-warren', beatIds: ['p1/a', 'p2/b'] },
    ]);
  });

  it('passes beats whose tags are all blessed', () => {
    const beats = [beat('p', 'a', ['wilderness', 'social'])];
    expect(analyzeBeatTags(beats, vocabulary)).toEqual([]);
  });

  it('ignores untagged beats', () => {
    expect(analyzeBeatTags([beat('p', 'a')], vocabulary)).toEqual([]);
  });

  it('flags every tag when the vocabulary is empty', () => {
    const beats = [beat('p', 'a', ['wilderness'])];
    expect(analyzeBeatTags(beats, new Set())).toEqual([
      { tag: 'wilderness', beatIds: ['p/a'] },
    ]);
  });

  it('orders warnings by use count, then alphabetically', () => {
    const beats = [
      beat('p', 'a', ['zz-rare', 'aa-rare', 'common']),
      beat('p', 'b', ['common']),
    ];
    expect(analyzeBeatTags(beats, vocabulary).map((w) => w.tag)).toEqual([
      'common',
      'aa-rare',
      'zz-rare',
    ]);
  });

  it('sorts and dedupes beat ids within a warning', () => {
    const beats = [
      beat('zeta', 'z', ['stray']),
      beat('alpha', 'a', ['stray', 'stray']),
    ];
    expect(analyzeBeatTags(beats, vocabulary)).toEqual([
      { tag: 'stray', beatIds: ['alpha/a', 'zeta/z'] },
    ]);
  });
});

describe('formatTagReport', () => {
  it('lists each off-vocabulary tag with its beats', () => {
    const report = formatTagReport([
      { tag: 'kobold-warren', beatIds: ['p1/a', 'p2/b'] },
      { tag: 'stray', beatIds: ['p1/a'] },
    ]);
    expect(report).toContain(
      'Off-vocabulary beat tags (bless in tags.yaml, collapse to a blessed tag, or drop):',
    );
    expect(report).toContain('  kobold-warren  (2 beats)');
    expect(report).toContain('    - p1/a');
    expect(report).toContain('    - p2/b');
    expect(report).toContain('  stray  (1 beat)');
  });

  it('reports all-clear when there are no warnings', () => {
    expect(formatTagReport([])).toBe(
      'All beat tags are in the blessed vocabulary.\n',
    );
  });
});

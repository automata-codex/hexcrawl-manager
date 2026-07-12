import { describe, it, expect } from 'vitest';

import {
  analyzeBeatTags,
  analyzeTags,
  formatTagReport,
  formatVocabularyReport,
  parseBeatVocabulary,
  parseVocabulary,
  type BeatTagsFile,
  type TaggedItem,
} from './tags-analyzer.js';

const beat = (
  parentPlotlineSlug: string,
  slug: string,
  tags?: string[],
): BeatTagsFile => ({ slug, parentPlotlineSlug, tags });

const hex = (id: string, tags?: string[]): TaggedItem => ({ id, tags });

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

// --- Generic core (exercised here with the hex domain) --------------------

describe('parseVocabulary', () => {
  it('extracts the list for the given domain key', () => {
    expect(parseVocabulary({ hex: ['haven', 'dungeon'] }, 'hex')).toEqual([
      'haven',
      'dungeon',
    ]);
  });

  it('reads the requested key, not a sibling', () => {
    expect(
      parseVocabulary({ beat: ['wilderness'], hex: ['haven'] }, 'hex'),
    ).toEqual(['haven']);
  });

  it('returns null when the key is missing', () => {
    expect(parseVocabulary({ beat: ['x'] }, 'hex')).toBeNull();
  });

  it('returns null for a non-object document', () => {
    expect(parseVocabulary(null, 'hex')).toBeNull();
    expect(parseVocabulary('hex', 'hex')).toBeNull();
  });

  it('returns null when the value is not a list', () => {
    expect(parseVocabulary({ hex: 'haven' }, 'hex')).toBeNull();
  });

  it('drops non-string entries', () => {
    expect(parseVocabulary({ hex: ['haven', 7, null] }, 'hex')).toEqual([
      'haven',
    ]);
  });
});

describe('analyzeTags', () => {
  const vocabulary = new Set(['haven', 'dungeon']);

  it('flags off-vocabulary tags grouped by tag, keyed by item id', () => {
    const hexes = [
      hex('m3', ['dungeon', 'lost-valley-barrier']),
      hex('n3', ['lost-valley-barrier']),
    ];
    expect(analyzeTags(hexes, vocabulary)).toEqual([
      { tag: 'lost-valley-barrier', ids: ['m3', 'n3'] },
    ]);
  });

  it('passes items whose tags are all blessed', () => {
    expect(analyzeTags([hex('a', ['haven', 'dungeon'])], vocabulary)).toEqual(
      [],
    );
  });

  it('ignores untagged items', () => {
    expect(analyzeTags([hex('a')], vocabulary)).toEqual([]);
  });

  it('flags every tag when the vocabulary is empty', () => {
    expect(analyzeTags([hex('a', ['haven'])], new Set())).toEqual([
      { tag: 'haven', ids: ['a'] },
    ]);
  });

  it('orders warnings by use count, then alphabetically', () => {
    const hexes = [hex('a', ['zz-rare', 'aa-rare', 'common']), hex('b', ['common'])];
    expect(analyzeTags(hexes, vocabulary).map((w) => w.tag)).toEqual([
      'common',
      'aa-rare',
      'zz-rare',
    ]);
  });

  it('sorts and dedupes ids within a warning', () => {
    const hexes = [hex('zeta', ['stray']), hex('alpha', ['stray', 'stray'])];
    expect(analyzeTags(hexes, vocabulary)).toEqual([
      { tag: 'stray', ids: ['alpha', 'zeta'] },
    ]);
  });
});

describe('formatVocabularyReport', () => {
  it('lists each off-vocabulary tag with its item ids and a pluralized noun', () => {
    const report = formatVocabularyReport(
      [
        { tag: 'lost-valley-barrier', ids: ['m3', 'n3'] },
        { tag: 'stray', ids: ['o3'] },
      ],
      'hex',
    );
    expect(report).toContain(
      'Off-vocabulary hex tags (bless in tags.yaml, collapse to a blessed tag, or drop):',
    );
    expect(report).toContain('  lost-valley-barrier  (2 hexes)');
    expect(report).toContain('    - m3');
    expect(report).toContain('    - n3');
    expect(report).toContain('  stray  (1 hex)');
  });

  it('reports all-clear when there are no warnings', () => {
    expect(formatVocabularyReport([], 'hex')).toBe(
      'All hex tags are in the blessed vocabulary.\n',
    );
  });

  it('uses a distinct item noun when provided', () => {
    expect(
      formatVocabularyReport([{ tag: 'x', ids: ['a', 'b'] }], 'beat', 'beat'),
    ).toContain('  x  (2 beats)');
  });
});

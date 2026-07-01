import { describe, it, expect } from 'vitest';

import {
  analyzePlacementIntegrity,
  clueRefIds,
  fileStem,
  formatReport,
  type AnalysisInput,
  type ParsedFile,
} from './placement-integrity-analyzer.js';

// --- builders -------------------------------------------------------------

const pf = (file: string, data: Record<string, unknown>): ParsedFile => ({ file, data });

const emptyInput = (over: Partial<AnalysisInput> = {}): AnalysisInput => ({
  clues: [],
  beats: [],
  hexes: [],
  encounters: [],
  dungeons: [],
  npcs: [],
  characters: [],
  pointcrawlNodes: [],
  roleplayBooks: [],
  ...over,
});

const clueDef = (id: string, extra: Record<string, unknown> = {}): ParsedFile =>
  pf(`clues/${id}.yaml`, { id, name: id, summary: 's', ...extra });

const beatDef = (
  plotline: string,
  slug: string,
  extra: Record<string, unknown> = {},
): ParsedFile =>
  pf(`plotlines/${plotline}/beats/${slug}.md`, { slug, plotline, title: slug, ...extra });

const hex = (id: string, data: Record<string, unknown>): ParsedFile =>
  pf(`hexes/${id}.yaml`, { id, slug: id, name: id, ...data });

const book = (slug: string, situational: unknown[]): ParsedFile =>
  pf(`roleplay-books/${slug}.yml`, {
    name: slug,
    keyword: slug,
    intelligenceReports: { rows: [], situational },
  });

const kinds = (input: AnalysisInput): string[] =>
  analyzePlacementIntegrity(input).map((f) => f.kind);

// --- pure helpers ---------------------------------------------------------

describe('fileStem', () => {
  it('strips directory and data extensions', () => {
    expect(fileStem('clues/foo.yaml')).toBe('foo');
    expect(fileStem('plotlines/pl/beats/bar.md')).toBe('bar');
    expect(fileStem('x/y/baz.mdx')).toBe('baz');
  });
});

describe('clueRefIds', () => {
  it('normalizes string and object refs and drops junk', () => {
    expect(clueRefIds(['a', { id: 'b', context: 'x' }, { nope: 1 }, 3])).toEqual(['a', 'b']);
  });
  it('returns [] for non-arrays', () => {
    expect(clueRefIds(undefined)).toEqual([]);
    expect(clueRefIds('a')).toEqual([]);
  });
});

// --- clean baseline -------------------------------------------------------

describe('analyzePlacementIntegrity — clean data', () => {
  it('returns no findings when every reference resolves', () => {
    const input = emptyInput({
      clues: [clueDef('c1'), clueDef('c2')],
      beats: [beatDef('pl', 'b1', { clues: ['c1'] })],
      hexes: [hex('q1', { landmark: { description: 'd', clues: ['c1'], beats: ['pl/b1'] } })],
      roleplayBooks: [book('bk', [])],
    });
    expect(analyzePlacementIntegrity(input)).toEqual([]);
  });
});

// --- dangling clue references across surfaces -----------------------------

describe('dangling clue references', () => {
  it('flags an unresolved clue in landmark.clues', () => {
    const input = emptyInput({
      clues: [clueDef('c1')],
      hexes: [hex('q1', { landmark: { description: 'd', clues: ['ghost'] } })],
    });
    const dangling = analyzePlacementIntegrity(input).filter((f) => f.kind === 'dangling-clue');
    expect(dangling).toHaveLength(1);
    expect(dangling[0].detail).toContain('ghost');
    expect(dangling[0].file).toBe('hexes/q1.yaml');
  });

  it.each([
    'encounters',
    'npcs',
    'characters',
    'pointcrawlNodes',
    'dungeons',
    'beats',
  ] as const)('resolves a clue delivered via %s (no finding)', (collection) => {
    const carrier =
      collection === 'beats'
        ? beatDef('pl', 'b1', { clues: ['c1'] })
        : pf(`${collection}/x`, { clues: ['c1'] });
    const input = emptyInput({ clues: [clueDef('c1')], [collection]: [carrier] });
    expect(analyzePlacementIntegrity(input)).toEqual([]);
  });

  it('flags an unresolved clue delivered via an NPC', () => {
    const input = emptyInput({
      clues: [clueDef('c1')],
      npcs: [pf('npcs/n.mdx', { clues: [{ id: 'ghost' }] })],
    });
    expect(kinds(input)).toEqual(['dangling-clue']);
  });

  it('checks hidden-site clues, clueId and linkId(clue)', () => {
    const input = emptyInput({
      clues: [clueDef('c1')],
      hexes: [
        hex('q1', {
          landmark: 'plain-string-landmark',
          hiddenSites: [
            { description: 'd', clues: ['c1'] }, // ok
            { description: 'd', clueId: 'ghost-1' }, // dangling
            { description: 'd', linkType: 'clue', linkId: 'ghost-2' }, // dangling
          ],
        }),
      ],
    });
    const details = analyzePlacementIntegrity(input)
      .filter((f) => f.kind === 'dangling-clue')
      .map((f) => f.detail);
    expect(details).toHaveLength(2);
    expect(details.some((d) => d.includes('ghost-1'))).toBe(true);
    expect(details.some((d) => d.includes('ghost-2'))).toBe(true);
  });

  it('checks dream-note clueId and clue.linkedClues', () => {
    const input = emptyInput({
      clues: [clueDef('c1', { linkedClues: ['ghost-link'] })],
      hexes: [hex('q1', { landmark: 'x', notes: [{ description: 'a dream', clueId: 'ghost-note' }] })],
    });
    const details = analyzePlacementIntegrity(input)
      .filter((f) => f.kind === 'dangling-clue')
      .map((f) => f.detail);
    expect(details.some((d) => d.includes('ghost-note'))).toBe(true);
    expect(details.some((d) => d.includes('ghost-link'))).toBe(true);
  });

  it('resolves clue references in object form', () => {
    const input = emptyInput({
      clues: [clueDef('c1')],
      hexes: [hex('q1', { landmark: { description: 'd', clues: [{ id: 'c1', context: 'searching' }] } })],
    });
    expect(analyzePlacementIntegrity(input)).toEqual([]);
  });
});

// --- dangling beat linkId -------------------------------------------------

describe('dangling beat linkId references', () => {
  it('flags an unresolved hidden-site linkId(beat)', () => {
    const input = emptyInput({
      beats: [beatDef('pl', 'b1')],
      hexes: [hex('q1', { landmark: 'x', hiddenSites: [{ description: 'd', linkType: 'beat', linkId: 'pl/ghost' }] })],
    });
    expect(kinds(input)).toEqual(['dangling-beat-link']);
  });

  it('flags an unresolved tidings linkId(beat)', () => {
    const input = emptyInput({
      beats: [beatDef('pl', 'b1')],
      roleplayBooks: [
        book('bk', [
          { report: 'r', linkType: 'beat', linkId: 'pl/ghost', sampleDialogue: 's', relevantConditions: 'c' },
        ]),
      ],
    });
    expect(kinds(input)).toEqual(['dangling-beat-link']);
  });

  it('does NOT dangling-check landmark.beats anchor arrays (validate-hex-beat-refs owns those)', () => {
    const input = emptyInput({
      beats: [beatDef('pl', 'b1')],
      hexes: [hex('q1', { landmark: { description: 'd', beats: ['pl/does-not-exist'] } })],
    });
    expect(analyzePlacementIntegrity(input)).toEqual([]);
  });
});

// --- back-links -----------------------------------------------------------

describe('forbidden placement back-links', () => {
  it('flags a placement array on a clue file', () => {
    const input = emptyInput({ clues: [clueDef('c1', { hexes: ['q1'] })] });
    const f = analyzePlacementIntegrity(input);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ kind: 'back-link', file: 'clues/c1.yaml' });
    expect(f[0].detail).toContain('hexes');
  });

  it('flags a placement array on a beat file', () => {
    const input = emptyInput({ beats: [beatDef('pl', 'b1', { placements: ['q1'] })] });
    expect(kinds(input)).toEqual(['back-link']);
  });
});

// --- double-home ----------------------------------------------------------

describe('double-home beats', () => {
  const tidings = (beatId: string) => ({
    report: 'r',
    linkType: 'beat',
    linkId: beatId,
    sampleDialogue: 's',
    relevantConditions: 'c',
  });

  it('flags a beat that is hex-anchored (landmark.beats) AND in tidings', () => {
    const input = emptyInput({
      beats: [beatDef('pl', 'b1')],
      hexes: [hex('q1', { landmark: { description: 'd', beats: ['pl/b1'] } })],
      roleplayBooks: [book('bk', [tidings('pl/b1')])],
    });
    const f = analyzePlacementIntegrity(input);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ kind: 'double-home' });
    expect(f[0].detail).toContain('pl/b1');
  });

  it('flags a beat anchored via hidden-site linkId AND in tidings', () => {
    const input = emptyInput({
      beats: [beatDef('pl', 'b1')],
      hexes: [hex('q1', { landmark: 'x', hiddenSites: [{ description: 'd', linkType: 'beat', linkId: 'pl/b1' }] })],
      roleplayBooks: [book('bk', [tidings('pl/b1')])],
    });
    expect(kinds(input)).toEqual(['double-home']);
  });

  it('does not flag a beat that is only anchored', () => {
    const input = emptyInput({
      beats: [beatDef('pl', 'b1')],
      hexes: [hex('q1', { landmark: { description: 'd', beats: ['pl/b1'] } })],
    });
    expect(analyzePlacementIntegrity(input)).toEqual([]);
  });

  it('does not flag a beat that is only in tidings', () => {
    const input = emptyInput({
      beats: [beatDef('pl', 'b1')],
      roleplayBooks: [book('bk', [tidings('pl/b1')])],
    });
    expect(analyzePlacementIntegrity(input)).toEqual([]);
  });
});

// --- duplicates + mismatches ----------------------------------------------

describe('duplicate ids', () => {
  it('flags two clue files sharing an id', () => {
    const input = emptyInput({
      clues: [clueDef('dupe'), pf('clues/other.yaml', { id: 'dupe', name: 'x', summary: 's' })],
    });
    const dups = analyzePlacementIntegrity(input).filter((f) => f.kind === 'duplicate-id');
    expect(dups).toHaveLength(1);
    expect(dups[0].file).toBe('clues/other.yaml');
  });

  it('flags two beats sharing a canonical id', () => {
    const input = emptyInput({
      beats: [beatDef('pl', 'b1'), pf('plotlines/pl/beats/b1-copy.md', { slug: 'b1', plotline: 'pl', title: 'x' })],
    });
    const f = analyzePlacementIntegrity(input);
    // duplicate canonical id + slug/path mismatch on the copy
    expect(f.filter((x) => x.kind === 'duplicate-id')).toHaveLength(1);
  });
});

describe('id / slug mismatches', () => {
  it('flags a clue whose id differs from its filename', () => {
    const input = emptyInput({ clues: [pf('clues/wrong-name.yaml', { id: 'real-id', name: 'x', summary: 's' })] });
    const f = analyzePlacementIntegrity(input);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ kind: 'id-mismatch' });
    expect(f[0].detail).toContain('real-id');
  });

  it('flags a beat whose frontmatter slug/plotline disagrees with its path', () => {
    const input = emptyInput({
      beats: [pf('plotlines/pl/beats/b2.md', { slug: 'wrong', plotline: 'pl', title: 'x' })],
    });
    const f = analyzePlacementIntegrity(input);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ kind: 'id-mismatch' });
    expect(f[0].detail).toContain('pl/b2');
  });
});

// --- reporting ------------------------------------------------------------

describe('formatReport', () => {
  it('returns the clean message when there are no findings', () => {
    expect(formatReport([])).toContain('All placement references resolve');
  });

  it('groups findings into titled sections in a stable order', () => {
    const report = formatReport([
      { kind: 'id-mismatch', file: 'clues/a.yaml', detail: 'id "x" ≠ filename "a"' },
      { kind: 'dangling-clue', file: 'hexes/q1.yaml', detail: 'landmark.clues → clue "ghost" not found' },
      { kind: 'double-home', file: 'hexes/q1.yaml', detail: 'beat "pl/b1" is hex-anchored AND in tidings' },
    ]);
    expect(report).toContain('Dangling clue references');
    expect(report).toContain('Double-home beats');
    expect(report).toContain('Id / slug mismatches');
    // dangling-clue section precedes id-mismatch section regardless of input order
    expect(report.indexOf('Dangling clue references')).toBeLessThan(report.indexOf('Id / slug mismatches'));
  });
});

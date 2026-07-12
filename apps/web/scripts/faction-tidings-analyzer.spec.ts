import { describe, it, expect } from 'vitest';

import {
  formatThreadsReport,
  gatherAllFactionThreads,
  gatherFactionThreads,
  resolveBodyFactions,
  type GatherInput,
  type TidingsBeatFile,
  type TidingsClueEntity,
  type TidingsFactionEntity,
  type TidingsPlotlineFile,
} from './faction-tidings-analyzer.js';

const faction = (
  id: string,
  name: string,
  plotlines: string[] = [],
): TidingsFactionEntity => ({ id, name, plotlines });

const plotline = (slug: string, body: string = ''): TidingsPlotlineFile => ({
  slug,
  title: slug,
  body,
});

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

const clue = (
  id: string,
  overrides: Partial<TidingsClueEntity> = {},
): TidingsClueEntity => ({ id, name: id, ...overrides });

const baseInput = (overrides: Partial<GatherInput> = {}): GatherInput => ({
  factions: [],
  plotlines: [],
  beats: [],
  clues: [],
  ...overrides,
});

describe('resolveBodyFactions', () => {
  it('resolves direct faction links in a Factions section', () => {
    const body = `
## Factions

### [Gruelith](/gm-reference/factions/gruelith)

They took Baz.
`;
    const out = resolveBodyFactions(
      [plotline('milly-and-baz', body)],
      [faction('gruelith', 'Gruelith')],
    );
    expect(out.get('milly-and-baz')).toEqual(new Set(['gruelith']));
  });

  it('resolves case-folded names when no link id is present', () => {
    const body = `
## Factions

- Stoneclan Compact — natural ally
`;
    const out = resolveBodyFactions(
      [plotline('milly-and-baz', body)],
      [faction('stoneclan-compact', 'Stoneclan Compact')],
    );
    expect(out.get('milly-and-baz')).toEqual(new Set(['stoneclan-compact']));
  });

  it('leaves oblique references unresolved (known residual)', () => {
    const body = `
## Factions

- The kobolds will not be pleased
`;
    const out = resolveBodyFactions(
      [plotline('p', body)],
      [faction('diplomatic-kobolds', 'Diplomatic Kobolds')],
    );
    expect(out.get('p')).toEqual(new Set());
  });
});

describe('gatherFactionThreads — plotline set', () => {
  it('unions explicit plotlines and body-derived plotlines with provenance', () => {
    const body = `
## Factions

### [Gruelith](/gm-reference/factions/gruelith)
`;
    const input = baseInput({
      factions: [faction('gruelith', 'Gruelith', ['explicit-only'])],
      plotlines: [plotline('body-only', body), plotline('explicit-only')],
    });
    const out = gatherFactionThreads(input, 'gruelith');
    expect(out.plotlines).toEqual([
      { slug: 'body-only', sources: ['body'] },
      { slug: 'explicit-only', sources: ['explicit'] },
    ]);
  });

  it('records both sources when a plotline is explicit and body-derived', () => {
    const body = `
## Factions

- Gruelith
`;
    const input = baseInput({
      factions: [faction('gruelith', 'Gruelith', ['p'])],
      plotlines: [plotline('p', body)],
    });
    const out = gatherFactionThreads(input, 'gruelith');
    expect(out.plotlines).toEqual([
      { slug: 'p', sources: ['explicit', 'body'] },
    ]);
  });

  it('throws on an unknown faction id', () => {
    expect(() => gatherFactionThreads(baseInput(), 'nope')).toThrow(
      'Unknown faction id: nope',
    );
  });
});

describe('gatherFactionThreads — beats', () => {
  it('surfaces direct beats via beat.factions', () => {
    const input = baseInput({
      factions: [faction('gruelith', 'Gruelith')],
      beats: [beat('other-plotline', 'the-raid', { factions: ['gruelith'] })],
    });
    const out = gatherFactionThreads(input, 'gruelith');
    expect(out.beats).toEqual([
      { id: 'other-plotline/the-raid', label: 'the-raid', via: ['direct'] },
    ]);
  });

  it('surfaces transitive beats under the faction plotline set', () => {
    const input = baseInput({
      factions: [faction('gruelith', 'Gruelith', ['milly-and-baz'])],
      beats: [
        beat('milly-and-baz', 'the-way-in'),
        beat('unrelated', 'elsewhere'),
      ],
    });
    const out = gatherFactionThreads(input, 'gruelith');
    expect(out.beats).toEqual([
      {
        id: 'milly-and-baz/the-way-in',
        label: 'the-way-in',
        via: ['via-plotline:milly-and-baz'],
      },
    ]);
  });

  it('tags a beat that surfaces both ways once, direct first', () => {
    const input = baseInput({
      factions: [faction('gruelith', 'Gruelith', ['milly-and-baz'])],
      beats: [beat('milly-and-baz', 'the-way-in', { factions: ['gruelith'] })],
    });
    const out = gatherFactionThreads(input, 'gruelith');
    expect(out.beats).toEqual([
      {
        id: 'milly-and-baz/the-way-in',
        label: 'the-way-in',
        via: ['direct', 'via-plotline:milly-and-baz'],
      },
    ]);
  });

  it('filters to live beats only', () => {
    const input = baseInput({
      factions: [faction('f', 'F', ['p'])],
      beats: [
        beat('p', 'pending-default'),
        beat('p', 'explicit-active', { status: 'active' }),
        beat('p', 'resolved', { status: 'resolved' }),
        beat('p', 'skipped', { status: 'skipped' }),
        beat('p', 'inactive', { campaignStatus: 'inactive' }),
      ],
    });
    const out = gatherFactionThreads(input, 'f');
    expect(out.beats.map((b) => b.id)).toEqual([
      'p/explicit-active',
      'p/pending-default',
    ]);
  });
});

describe('gatherFactionThreads — clues', () => {
  it('surfaces direct clues via clue.factions', () => {
    const input = baseInput({
      factions: [faction('gruelith', 'Gruelith')],
      clues: [clue('baz-alive', { name: 'Baz Alive', factions: ['gruelith'] })],
    });
    const out = gatherFactionThreads(input, 'gruelith');
    expect(out.clues).toEqual([
      { id: 'baz-alive', label: 'Baz Alive', via: ['direct'] },
    ]);
  });

  it('surfaces transitive clues whose plotlines intersect the set', () => {
    const input = baseInput({
      factions: [faction('f', 'F', ['p1', 'p2'])],
      clues: [
        clue('both', { plotlines: ['p2', 'p1'] }),
        clue('outside', { plotlines: ['p3'] }),
      ],
    });
    const out = gatherFactionThreads(input, 'f');
    expect(out.clues).toEqual([
      {
        id: 'both',
        label: 'both',
        via: ['via-plotline:p1', 'via-plotline:p2'],
      },
    ]);
  });

  it('filters to unknown, campaign-active clues only', () => {
    const input = baseInput({
      factions: [faction('f', 'F')],
      clues: [
        clue('live', { factions: ['f'] }),
        clue('known', { factions: ['f'], status: 'known' }),
        clue('inactive', { factions: ['f'], campaignStatus: 'inactive' }),
      ],
    });
    const out = gatherFactionThreads(input, 'f');
    expect(out.clues.map((c) => c.id)).toEqual(['live']);
  });
});

describe('gatherAllFactionThreads', () => {
  it('returns one entry per faction, ordered by id', () => {
    const input = baseInput({
      factions: [faction('zeta', 'Zeta'), faction('alpha', 'Alpha')],
    });
    const out = gatherAllFactionThreads(input);
    expect(out.map((t) => t.factionId)).toEqual(['alpha', 'zeta']);
  });
});

describe('formatThreadsReport', () => {
  it('lists items with surfacing tags, grouped by faction', () => {
    const input = baseInput({
      factions: [faction('gruelith', 'Gruelith', ['milly-and-baz'])],
      beats: [beat('milly-and-baz', 'the-way-in', { title: 'The Way In' })],
      clues: [clue('baz-alive', { name: 'Baz Alive', factions: ['gruelith'] })],
    });
    const report = formatThreadsReport([
      gatherFactionThreads(input, 'gruelith'),
    ]);
    expect(report).toContain('Faction: Gruelith (gruelith)');
    expect(report).toContain('    - milly-and-baz  [explicit]');
    expect(report).toContain(
      '    - milly-and-baz/the-way-in  (The Way In)  [via-plotline:milly-and-baz]',
    );
    expect(report).toContain('    - baz-alive  (Baz Alive)  [direct]');
  });

  it('marks empty sections explicitly', () => {
    const input = baseInput({ factions: [faction('f', 'F')] });
    const report = formatThreadsReport([gatherFactionThreads(input, 'f')]);
    expect(report).toContain('Plotlines: (none)');
    expect(report).toContain('Live beats: (none)');
    expect(report).toContain('Live clues: (none)');
  });

  it('handles an empty faction list', () => {
    expect(formatThreadsReport([])).toBe('No factions found.\n');
  });
});

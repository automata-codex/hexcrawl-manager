import type { BeatData } from '@achm/schemas';
import { describe, it, expect } from 'vitest';

import { resolveBeat } from './resolve-beats.js';

const lookups = {
  npcsById: new Map([
    ['daemaris', { displayName: 'Daemaris' }],
    ['orlin-vex', { displayName: 'Orlin Vex' }],
  ]),
  factionsById: new Map([
    ['sword-of-the-king', { name: 'Sword of the King' }],
    ['fort-dagaric', { name: 'Fort Dagaric' }],
  ]),
  cluesById: new Map([
    ['cipher-fragment', { name: 'Cipher Fragment', status: 'known' }],
    ['sealed-letter', { name: 'Sealed Letter', status: 'unknown' }],
  ]),
};

const baseBeat = (overrides: Partial<BeatData>): BeatData => ({
  slug: 'test-beat',
  title: 'Test beat',
  plotline: 'daemaris',
  status: 'pending',
  campaignStatus: 'active',
  ...overrides,
});

describe('resolveBeat', () => {
  it('resolves known faction/npc/clue ids with found=true', () => {
    const beat = resolveBeat(
      baseBeat({
        status: 'active',
        factions: ['sword-of-the-king'],
        npcs: ['daemaris', 'orlin-vex'],
        clues: ['cipher-fragment'],
      }),
      lookups,
    );
    expect(beat.factions).toEqual([
      { id: 'sword-of-the-king', name: 'Sword of the King', found: true },
    ]);
    expect(beat.npcs).toEqual([
      { id: 'daemaris', name: 'Daemaris', found: true },
      { id: 'orlin-vex', name: 'Orlin Vex', found: true },
    ]);
    expect(beat.clues).toEqual([
      { id: 'cipher-fragment', name: 'Cipher Fragment', found: true, clueStatus: 'known' },
    ]);
  });

  it('falls back to the bare id with found=false when an entity is missing', () => {
    const beat = resolveBeat(
      baseBeat({
        factions: ['ghost-faction'],
        npcs: ['unknown-npc'],
        clues: ['ghost-clue'],
      }),
      lookups,
    );
    expect(beat.factions).toEqual([
      { id: 'ghost-faction', name: 'ghost-faction', found: false },
    ]);
    expect(beat.npcs).toEqual([
      { id: 'unknown-npc', name: 'unknown-npc', found: false },
    ]);
    expect(beat.clues).toEqual([
      { id: 'ghost-clue', name: 'ghost-clue', found: false, clueStatus: undefined },
    ]);
  });

  it('handles clue references in object form with context', () => {
    const beat = resolveBeat(
      baseBeat({
        clues: [
          'cipher-fragment',
          { id: 'sealed-letter', context: 'Found in the safehouse' },
        ],
      }),
      lookups,
    );
    expect(beat.clues.map((c) => c.id)).toEqual(['cipher-fragment', 'sealed-letter']);
    expect(beat.clues.map((c) => c.found)).toEqual([true, true]);
  });

  it('passes through trigger verbatim', () => {
    const beat = resolveBeat(
      baseBeat({ trigger: 'After the PCs talk to Vex' }),
      lookups,
    );
    expect(beat.trigger).toBe('After the PCs talk to Vex');
  });

  it('treats missing optional ref arrays as empty', () => {
    const beat = resolveBeat(baseBeat({}), lookups);
    expect(beat.factions).toEqual([]);
    expect(beat.npcs).toEqual([]);
    expect(beat.clues).toEqual([]);
  });

  it('preserves slug and parent plotline from input', () => {
    const beat = resolveBeat(
      baseBeat({ slug: 'cache-discovery', plotline: 'daemaris' }),
      lookups,
    );
    expect(beat.slug).toBe('cache-discovery');
    expect(beat.plotline).toBe('daemaris');
  });
});

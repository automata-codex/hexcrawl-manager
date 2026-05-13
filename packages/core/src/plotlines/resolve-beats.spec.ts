import type { PlotlineBeatData } from '@achm/schemas';
import { describe, it, expect } from 'vitest';

import { resolveBeats } from './resolve-beats.js';

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

describe('resolveBeats', () => {
  it('returns empty array for undefined beats', () => {
    expect(resolveBeats(undefined, lookups)).toEqual([]);
  });

  it('preserves array order', () => {
    const beats: PlotlineBeatData[] = [
      { title: 'First', status: 'pending', factions: [], npcs: [], clues: [] },
      { title: 'Second', status: 'active', factions: [], npcs: [], clues: [] },
      { title: 'Third', status: 'resolved', factions: [], npcs: [], clues: [] },
    ];
    const result = resolveBeats(beats, lookups);
    expect(result.map((b) => b.title)).toEqual(['First', 'Second', 'Third']);
    expect(result.map((b) => b.status)).toEqual(['pending', 'active', 'resolved']);
  });

  it('resolves known faction/npc/clue ids with found=true', () => {
    const beats: PlotlineBeatData[] = [
      {
        title: 'The cache',
        status: 'active',
        factions: ['sword-of-the-king'],
        npcs: ['daemaris', 'orlin-vex'],
        clues: ['cipher-fragment'],
      },
    ];
    const [beat] = resolveBeats(beats, lookups);
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
    const beats: PlotlineBeatData[] = [
      {
        title: 'Drift test',
        status: 'pending',
        factions: ['ghost-faction'],
        npcs: ['unknown-npc'],
        clues: ['ghost-clue'],
      },
    ];
    const [beat] = resolveBeats(beats, lookups);
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
    const beats: PlotlineBeatData[] = [
      {
        title: 'Mixed clue refs',
        status: 'active',
        clues: [
          'cipher-fragment',
          { id: 'sealed-letter', context: 'Found in the safehouse' },
        ],
      },
    ];
    const [beat] = resolveBeats(beats, lookups);
    expect(beat.clues.map((c) => c.id)).toEqual(['cipher-fragment', 'sealed-letter']);
    expect(beat.clues.map((c) => c.found)).toEqual([true, true]);
  });

  it('passes through trigger and notes verbatim', () => {
    const beats: PlotlineBeatData[] = [
      {
        title: 'Annotated beat',
        status: 'pending',
        trigger: 'After the PCs talk to Vex',
        notes: 'GM note: tie this in',
      },
    ];
    const [beat] = resolveBeats(beats, lookups);
    expect(beat.trigger).toBe('After the PCs talk to Vex');
    expect(beat.notes).toBe('GM note: tie this in');
  });

  it('treats missing optional ref arrays as empty', () => {
    const beats: PlotlineBeatData[] = [{ title: 'Bare beat', status: 'pending' }];
    const [beat] = resolveBeats(beats, lookups);
    expect(beat.factions).toEqual([]);
    expect(beat.npcs).toEqual([]);
    expect(beat.clues).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';

import { PlotlineBeatSchema, PlotlineSchema } from './plotline.js';

describe('PlotlineBeatSchema', () => {
  it('accepts a minimal beat and defaults status to pending', () => {
    const result = PlotlineBeatSchema.safeParse({ title: 'Daemaris confronts the Council' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('pending');
    }
  });

  it('accepts a beat with all optional fields populated', () => {
    const beat = {
      title: 'Operatives uncover the cache',
      status: 'active',
      trigger: 'After the PCs interrogate Vex',
      factions: ['sword-of-the-king', 'fort-dagaric'],
      npcs: ['orlin-vex', 'daemaris'],
      clues: ['cipher-fragment', { id: 'sealed-letter', context: 'Found in the safehouse' }],
      notes: 'GM note: tie this to the rumor table',
    };
    const result = PlotlineBeatSchema.safeParse(beat);
    expect(result.success).toBe(true);
  });

  it('accepts each valid status value', () => {
    for (const status of ['pending', 'active', 'resolved', 'skipped'] as const) {
      const result = PlotlineBeatSchema.safeParse({ title: 'x', status });
      expect(result.success).toBe(true);
    }
  });

  it('rejects an invalid status value', () => {
    const result = PlotlineBeatSchema.safeParse({ title: 'x', status: 'in-progress' });
    expect(result.success).toBe(false);
  });

  it('rejects a beat missing the required title', () => {
    const result = PlotlineBeatSchema.safeParse({ status: 'active' });
    expect(result.success).toBe(false);
  });
});

describe('PlotlineSchema beats field', () => {
  it('accepts a plotline without beats', () => {
    const plotline = {
      slug: 'daemaris',
      title: 'The Daemaris Affair',
    };
    const result = PlotlineSchema.safeParse(plotline);
    expect(result.success).toBe(true);
  });

  it('accepts a plotline with an array of beats', () => {
    const plotline = {
      slug: 'daemaris',
      title: 'The Daemaris Affair',
      beats: [
        { title: 'Opening move' },
        { title: 'The cache', status: 'active', npcs: ['daemaris'] },
        { title: 'Resolution', status: 'resolved' },
      ],
    };
    const result = PlotlineSchema.safeParse(plotline);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.beats).toHaveLength(3);
      expect(result.data.beats?.[0].status).toBe('pending');
    }
  });

  it('rejects a plotline with an invalid beat', () => {
    const plotline = {
      slug: 'daemaris',
      title: 'The Daemaris Affair',
      beats: [{ title: 'Bad beat', status: 'unknown-status' }],
    };
    const result = PlotlineSchema.safeParse(plotline);
    expect(result.success).toBe(false);
  });
});

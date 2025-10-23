import { Pace } from '@skyreach/schemas';
import { describe, it, expect } from 'vitest';

import { collectHexIntents } from './collect-hex-intents';

// Minimal event helpers (match your FinalizedHexEvent shape)
function scout(target: string, landmark = false) {
  return {
    seq: 27,
    ts: '2024-01-01T12:00:00Z',
    kind: 'scout' as const,
    payload: {
      from: 'P12',
      target,
      reveal: { terrain: false, vegetation: false, landmark },
    },
  };
}

function explore(target: string) {
  return {
    seq: 27,
    ts: '2024-01-01T12:00:00Z',
    kind: 'explore' as const,
    payload: { target },
  };
}

function move(from: string, to: string) {
  return {
    seq: 27,
    ts: '2024-01-01T12:00:00Z',
    kind: 'move' as const,
    payload: { from, to, pace: 'normal' as Pace },
  };
}

describe('collectHexIntents', () => {
  it('sets scouted when a scout targets the hex', () => {
    const intents = collectHexIntents([scout('q12')]);
    expect(intents['Q12']).toBeDefined(); // normalized via normalizeHexId
    expect(intents['Q12'].scouted).toBe(true);
    expect(intents['Q12'].visited).toBeUndefined();
    expect(intents['Q12'].explored).toBeUndefined();
    expect(intents['Q12'].landmarkKnown).toBeUndefined();
  });

  it('sets visited when a move arrives in the hex', () => {
    const intents = collectHexIntents([move('q11', 'q12')]);
    expect(intents['Q12']).toBeDefined();
    expect(intents['Q12'].visited).toBe(true);
    expect(intents['Q12'].scouted).toBeUndefined();
    expect(intents['Q12'].explored).toBeUndefined();
  });

  it('sets explored when an explore targets the hex', () => {
    const intents = collectHexIntents([explore('q12')]);
    expect(intents['Q12']).toBeDefined();
    expect(intents['Q12'].explored).toBe(true);
    expect(intents['Q12'].visited).toBeUndefined(); // independent (no back-fill)
    expect(intents['Q12'].scouted).toBeUndefined();
  });

  it('adds landmarkKnown only when scout reveal.landmark is true', () => {
    const a = collectHexIntents([scout('q12', false)]);
    expect(a['Q12'].landmarkKnown).toBeUndefined();

    const b = collectHexIntents([scout('q12', true)]);
    expect(b['Q12'].landmarkKnown).toBe(true);
  });

  it('merges multiple events for the same hex into a single intent', () => {
    const intents = collectHexIntents([
      scout('q12', true),
      move('Q11', 'Q12'),           // mixed case on purpose
      explore('q12'),
    ]);

    expect(Object.keys(intents)).toEqual(['Q12']); // single normalized key
    expect(intents['Q12']).toEqual({
      scouted: true,
      landmarkKnown: true,
      visited: true,
      explored: true,
    });
  });

  it('is idempotent across duplicate events', () => {
    const intents = collectHexIntents([
      scout('q12', true),
      scout('Q12', true),
      move('q11', 'q12'),
      move('Q11', 'Q12'),
      explore('q12'),
      explore('Q12'),
    ]);

    expect(Object.keys(intents)).toEqual(['Q12']);
    expect(intents['Q12']).toEqual({
      scouted: true,
      landmarkKnown: true,
      visited: true,
      explored: true,
    });
  });

  it('collects intents for multiple distinct hexes', () => {
    const intents = collectHexIntents([
      scout('p11'),
      move('q11', 'q12'),
      explore('r13'),
    ]);

    // All keys normalized (uppercase letters, digits preserved)
    expect(new Set(Object.keys(intents))).toEqual(new Set(['P11', 'Q12', 'R13']));
    expect(intents['P11'].scouted).toBe(true);
    expect(intents['Q12'].visited).toBe(true);
    expect(intents['R13'].explored).toBe(true);
  });

  it('does not cross-contaminate flags between hexes', () => {
    const intents = collectHexIntents([
      scout('q12'),      // scouted Q12
      move('r14', 'r13'),       // visited R13
      explore('s14'),    // explored S14
    ]);

    expect(intents['Q12']).toEqual({ scouted: true });
    expect(intents['R13']).toEqual({ visited: true });
    expect(intents['S14']).toEqual({ explored: true });
  });
});

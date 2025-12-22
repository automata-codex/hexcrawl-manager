import { Pace, type CoordinateNotation } from '@achm/schemas';
import { describe, it, expect } from 'vitest';

import { collectHexIntents } from './collect-hex-intents';

const NOTATION: CoordinateNotation = 'letter-number';

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
    const intents = collectHexIntents([scout('q12')], NOTATION);
    expect(intents['q12']).toBeDefined(); // normalized via normalizeHexId (lowercase)
    expect(intents['q12'].scouted).toBe(true);
    expect(intents['q12'].visited).toBeUndefined();
    expect(intents['q12'].explored).toBeUndefined();
    expect(intents['q12'].landmarkKnown).toBeUndefined();
  });

  it('sets visited when a move arrives in the hex', () => {
    const intents = collectHexIntents([move('q11', 'q12')], NOTATION);
    expect(intents['q12']).toBeDefined();
    expect(intents['q12'].visited).toBe(true);
    expect(intents['q12'].scouted).toBeUndefined();
    expect(intents['q12'].explored).toBeUndefined();
  });

  it('sets explored when an explore targets the hex', () => {
    const intents = collectHexIntents([explore('q12')], NOTATION);
    expect(intents['q12']).toBeDefined();
    expect(intents['q12'].explored).toBe(true);
    expect(intents['q12'].visited).toBeUndefined(); // independent (no back-fill)
    expect(intents['q12'].scouted).toBeUndefined();
  });

  it('adds landmarkKnown only when scout reveal.landmark is true', () => {
    const a = collectHexIntents([scout('q12', false)], NOTATION);
    expect(a['q12'].landmarkKnown).toBeUndefined();

    const b = collectHexIntents([scout('q12', true)], NOTATION);
    expect(b['q12'].landmarkKnown).toBe(true);
  });

  it('merges multiple events for the same hex into a single intent', () => {
    const intents = collectHexIntents(
      [
        scout('q12', true),
        move('Q11', 'Q12'), // mixed case on purpose
        explore('q12'),
      ],
      NOTATION,
    );

    expect(Object.keys(intents)).toEqual(['q12']); // single normalized key (lowercase)
    expect(intents['q12']).toEqual({
      scouted: true,
      landmarkKnown: true,
      visited: true,
      explored: true,
    });
  });

  it('is idempotent across duplicate events', () => {
    const intents = collectHexIntents(
      [
        scout('q12', true),
        scout('Q12', true),
        move('q11', 'q12'),
        move('Q11', 'Q12'),
        explore('q12'),
        explore('Q12'),
      ],
      NOTATION,
    );

    expect(Object.keys(intents)).toEqual(['q12']);
    expect(intents['q12']).toEqual({
      scouted: true,
      landmarkKnown: true,
      visited: true,
      explored: true,
    });
  });

  it('collects intents for multiple distinct hexes', () => {
    const intents = collectHexIntents(
      [scout('p11'), move('q11', 'q12'), explore('r13')],
      NOTATION,
    );

    // All keys normalized (lowercase for internal storage)
    expect(new Set(Object.keys(intents))).toEqual(
      new Set(['p11', 'q12', 'r13']),
    );
    expect(intents['p11'].scouted).toBe(true);
    expect(intents['q12'].visited).toBe(true);
    expect(intents['r13'].explored).toBe(true);
  });

  it('does not cross-contaminate flags between hexes', () => {
    const intents = collectHexIntents(
      [
        scout('q12'), // scouted q12
        move('r14', 'r13'), // visited r13
        explore('s14'), // explored s14
      ],
      NOTATION,
    );

    expect(intents['q12']).toEqual({ scouted: true });
    expect(intents['r13']).toEqual({ visited: true });
    expect(intents['s14']).toEqual({ explored: true });
  });
});

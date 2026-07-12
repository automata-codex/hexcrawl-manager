import { describe, expect, it } from 'vitest';

import { makeEncounterNote } from './make-encounter-note';

describe('makeEncounterNote', () => {
  it('prompts the GM to roll and resume, naming the hex and threshold', () => {
    const note = makeEncounterNote('P12', 8);
    expect(note).toContain('Encounter check triggered entering P12');
    expect(note).toContain('rolled ≤ 8');
    expect(note).toContain('Roll on the region table');
    expect(note).toContain('`fast resume`');
  });
});

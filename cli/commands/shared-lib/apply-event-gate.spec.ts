import { describe, it, expect } from 'vitest';

import { applyEventGate, type ApEvent } from './apply-event-gate.ts';

describe('applyEventGate', () => {
  it('≤0019 with over-tier: include + reason "grandfathered"', () => {
    const events: ApEvent[] = [
      { pillar: 'combat', number: 2, maxTier: 1 }, // over-tier for T2+
      { pillar: 'combat', number: 1, maxTier: 2 }, // eligible for T2
    ];
    const result = applyEventGate(events, 2, 19);
    expect(result.deltas.combat).toBe(3);
    expect(result.reasons.combat).toBe('grandfathered');
  });

  it('≥0020 with over-tier: exclude + reason "cap"', () => {
    const events: ApEvent[] = [
      { pillar: 'combat', number: 2, maxTier: 1 }, // over-tier for T2+
      { pillar: 'combat', number: 1, maxTier: 2 }, // eligible for T2
    ];
    const result = applyEventGate(events, 2, 20);
    expect(result.deltas.combat).toBe(1);
    expect(result.reasons.combat).toBe('cap');
  });

  it('≥0020 mixed eligible/over-tier: "cap" but sum only eligible', () => {
    const events: ApEvent[] = [
      { pillar: 'combat', number: 2, maxTier: 1 }, // over-tier
      { pillar: 'combat', number: 1, maxTier: 2 }, // eligible
      { pillar: 'combat', number: 3, maxTier: 2 }, // eligible
    ];
    const result = applyEventGate(events, 2, 20);
    expect(result.deltas.combat).toBe(4);
    expect(result.reasons.combat).toBe('cap');
  });

  it('missing event.maxTier ⇒ treated as 1', () => {
    const events: ApEvent[] = [
      { pillar: 'combat', number: 2 }, // maxTier undefined
    ];
    const result = applyEventGate(events, 2, 20);
    expect(result.deltas.combat).toBe(0); // T2 > 1, so excluded
    expect(result.reasons.combat).toBe('normal');
  });

  it('notes: last note per pillar wins', () => {
    const events: ApEvent[] = [
      { pillar: 'combat', number: 1, maxTier: 2, note: 'first' },
      { pillar: 'combat', number: 1, maxTier: 2, note: 'second' },
    ];
    const result = applyEventGate(events, 2, 19);
    expect(result.notes.combat).toBe('second');
  });

  it('attended but no AP events → delta 0, reason "normal"', () => {
    const result = applyEventGate([], 1, 21);
    expect(result.deltas.combat).toBe(0);
    expect(result.reasons.combat).toBe('normal');
    expect(result.deltas.exploration).toBe(0);
    expect(result.reasons.exploration).toBe('normal');
    expect(result.deltas.social).toBe(0);
    expect(result.reasons.social).toBe('normal');
  });
});

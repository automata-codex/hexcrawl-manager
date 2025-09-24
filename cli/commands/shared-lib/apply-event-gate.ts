import type { Pillar } from '../../../src/types';

export interface ApEvent {
  pillar: Pillar;
  number: number;
  maxTier?: number;
  note?: string;
}

export interface GateResult {
  deltas: Record<Pillar, number>;
  reasons: Record<Pillar, 'normal'|'grandfathered'|'cap'>;
  notes: Partial<Record<Pillar, string>>;
}

export function applyEventGate(
  events: ApEvent[],
  characterTier: 1|2|3|4,
  sessionNumber: number
): GateResult {
  const pillars: Pillar[] = ['combat', 'exploration', 'social'];
  const deltas: Record<Pillar, number> = { combat: 0, exploration: 0, social: 0 };
  const reasons: Record<Pillar, 'normal'|'grandfathered'|'cap'> = { combat: 'normal', exploration: 'normal', social: 'normal' };
  const notes: Partial<Record<Pillar, string>> = {};

  for (const pillar of pillars) {
    const eventsForPillar = events.filter(e => e.pillar === pillar);
    let eligible = 0;
    let overTier = 0;
    let lastNote: string | undefined;
    for (const e of eventsForPillar) {
      const maxTier = e.maxTier ?? 1;
      if (e.note) lastNote = e.note;
      if (characterTier <= maxTier) {
        eligible += e.number;
      } else {
        overTier += e.number;
      }
    }

    // Era rules
    if (sessionNumber <= 19) {
      deltas[pillar] = eligible + overTier;
      reasons[pillar] = overTier > 0 ? 'grandfathered' : 'normal';
    } else {
      deltas[pillar] = eligible;
      // Only set 'cap' if both eligible and overTier exist
      if (overTier > 0 && eligible > 0) {
        reasons[pillar] = 'cap';
      } else {
        reasons[pillar] = 'normal';
      }
    }

    if (lastNote) {
      notes[pillar] = lastNote;
    }
  }
  return { deltas, reasons, notes };
}

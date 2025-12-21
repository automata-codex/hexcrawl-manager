import {
  ApLedgerEntry,
  ApLedgerEntrySchema,
  Pillar,
  makeSessionId,
} from '@achm/schemas';

const apTriplet = <R extends 'normal' | 'absence_spend'>(
  deltas: Partial<Record<Pillar, number>>,
  reason: R,
) => ({
  combat: { delta: deltas.combat ?? 0, reason },
  exploration: { delta: deltas.exploration ?? 0, reason },
  social: { delta: deltas.social ?? 0, reason },
});

export const normalAp = (deltas: Partial<Record<Pillar, number>>) =>
  apTriplet(deltas, 'normal');

export const absenceAp = (deltas: Partial<Record<Pillar, number>>) =>
  apTriplet(deltas, 'absence_spend');

// Factories
export function makeSessionAp(entry: {
  characterId: string;
  session: number | string;
  appliedAt: string; // deterministic in tests
  deltas?: ApLedgerEntry['advancementPoints']; // default = normal(1)
  notes?: string;
}): ApLedgerEntry {
  const e: ApLedgerEntry = {
    kind: 'session_ap',
    characterId: entry.characterId,
    sessionId: makeSessionId(entry.session),
    appliedAt: entry.appliedAt,
    advancementPoints:
      entry.deltas ?? normalAp({ combat: 1, exploration: 1, social: 1 }),
    ...(entry.notes ? { notes: entry.notes } : {}),
  };
  return ApLedgerEntrySchema.parse(e);
}

export function makeAbsenceSpend(entry: {
  characterId: string;
  session: number | string; // “attach to most recent completed” => you pass it in
  appliedAt: string;
  deltas: Partial<Record<Pillar, number>>; // only the pillars spent
  notes?: string;
}): ApLedgerEntry {
  const e: ApLedgerEntry = {
    kind: 'absence_spend',
    characterId: entry.characterId,
    sessionId: makeSessionId(entry.session),
    appliedAt: entry.appliedAt,
    advancementPoints: absenceAp(entry.deltas),
    ...(entry.notes ? { notes: entry.notes } : {}),
  };
  return ApLedgerEntrySchema.parse(e);
}

// Convenience: rectangular grid for session_ap
export function makeSessionApGrid(opts: {
  characters: string[];
  sessions: Array<number | string>;
  // eslint-disable-next-line no-unused-vars
  appliedAtBySession: (s: number | string) => string;

  deltasBy?: (
    c: string,
    s: number | string,
  ) => ApLedgerEntry['advancementPoints'];
  // eslint-disable-next-line no-unused-vars
  notesBy?: (c: string, s: number | string) => string | undefined;
}) {
  const { characters, sessions, appliedAtBySession, deltasBy, notesBy } = opts;
  const rows: ApLedgerEntry[] = [];
  for (const s of sessions) {
    for (const c of characters) {
      rows.push(
        makeSessionAp({
          characterId: c,
          session: s,
          appliedAt: appliedAtBySession(s),
          deltas: deltasBy?.(c, s),
          notes: notesBy?.(c, s),
        }),
      );
    }
  }
  return rows;
}

import { makeSessionId, SessionReport } from '@achm/schemas';

export function makeCompletedSessionReport(opts: {
  n: number; // 1-based counter -> session id
  date: string; // YYYY-MM-DD real-world date
  present: string[]; // characterIds present
}): SessionReport {
  const id = makeSessionId(opts.n);
  return {
    id,
    status: 'completed',
    // required header bits
    absenceAllocations: [],
    downtime: [],
    gameStartDate: '',
    schemaVersion: 2,
    scribeIds: [`${makeSessionId(opts.n)}_2025-09-01`], // any valid ScribeId shape
    sessionDate: opts.date,
    source: 'scribe',
    // completed-only
    advancementPoints: {
      combat: { number: 1, maxTier: 1 },
      exploration: { number: 1, maxTier: 1 },
      social: { number: 1, maxTier: 1 },
    },
    characterIds: [
      // Strings are PCs; objects would be guests (we omit guests here in happy path)
      ...opts.present,
    ],
    fingerprint: `fp-${id}`,
    gameEndDate: '',
    notes: [],
    todo: [],
    weave: { appliedAt: `${opts.date}T12:00:00.000Z`, version: '1' },
  } satisfies SessionReport;
}

export function makePlannedSessionReport(opts: { n: number }): SessionReport {
  const id = makeSessionId(opts.n);
  return {
    id,
    status: 'planned',
    absenceAllocations: [],
    downtime: [],
    gameStartDate: '',
    schemaVersion: 2,
    scribeIds: [],
    sessionDate: '', // blank for planned
    source: 'scribe',
    agenda: '',
    gmNotes: '',
  } satisfies SessionReport;
}

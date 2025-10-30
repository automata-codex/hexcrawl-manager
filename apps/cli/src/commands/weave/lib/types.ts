import { ExploreEvent, MoveEvent, ScoutEvent } from '@skyreach/schemas';

export interface ApplyTrailsDebug {
  /** Before/after snapshots for touched edges (subset, not whole file). */
  touched?: {
    before: Record<string, unknown | undefined>;
    after: Record<string, unknown | undefined>;
  };

  /** Raw effect payloads returned by the lib helpers. */
  effects?: unknown; // { session: ... } or { rollover: ... } in legacy

  /** The full path that was resolved/used. */
  sourceFile?: string;

  /** Footprint id that would be written (e.g., `S-<fileId>` or `ROLL-<season>`). */
  footprintId?: string;
}

export type ApplyTrailsKind = 'session' | 'rollover';

export interface ApplyTrailsResult {
  /** Derived from file and guards. */
  kind?: ApplyTrailsKind;
  seasonId?: string; // normalized (first season for sessions)
  fileId?: string; // basename of the applied file
  dryRun?: boolean;

  /** High-level outcome & coarse stats for CLI printing. */
  status: ApplyTrailsStatus;
  summary?: ApplyTrailsSummary;

  /** Include when status !== 'ok' for caller's messaging. */
  message?: string;

  /** Optional rich details (behind `verbose`). */
  debug?: ApplyTrailsDebug;

  /** Info about automatic rollover applied due to inter-session season change. */
  autoRollover?: {
    seasonId: string;
    maintained: number;
    persisted: number;
    deletedTrails: number;
  } | null;
}

export type ApplyTrailsStatus =
  | 'ok' // wrote changes (or would have in dryRun)
  | 'already-applied' // idempotency guard tripped
  | 'no-op' // valid input but nothing to change
  | 'validation-error' // schema/chronology/semantic checks failed
  | 'unrecognized-file' // neither session nor rollover
  | 'io-error'; // write failed (not thrown if you prefer status)

export interface ApplyTrailsSummary {
  // Session apply deltas
  created?: number; // effects.created.length
  rediscovered?: number; // effects.rediscovered.length
  usesFlagged?: number; // Object.keys(effects.usedFlags).length

  // Rollover deltas
  maintained?: number; // effects.maintained.length
  persisted?: number; // effects.persisted.length
  deletedTrails?: number; // effects.deletedTrails.length

  // Aggregate/touch metrics (both paths)
  edgesTouched?: number; // unique keys in before/after set
}

export type FinalizedHexEvent = ScoutEvent | ExploreEvent | MoveEvent;

export type HexId = string;

export type HexIntent = {
  scouted?: true;
  visited?: true;
  explored?: true;
  landmarkKnown?: true;
};

export type HexIntents = Record<HexId, HexIntent>;

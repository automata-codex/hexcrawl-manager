import {
  type ScribeEvent,
  type ScribeEventKind,
  type PayloadOfKind,
} from '@skyreach/schemas';

/** Discriminated prototype produced by your builders */
export type EventPrototype<K extends ScribeEventKind> = {
  kind: K;
  payload: PayloadOfKind<K>;
};
export type AnyEventPrototype = EventPrototype<ScribeEventKind>;

export interface FinalizeOptions {
  /** Default: 2025-10-01T00:00:00Z */
  startTime?: string | number | Date;
  /** Default: 60_000 ms (1 minute) */
  stepMs?: number;
  /** Start seq from this number. Default: 1 */
  baseSeq?: number;
}

/** Map raw prototypes → finalized ScribeEvent[] with seq/ts */
export function makeLog(
  prototypes: AnyEventPrototype[],
  opts: FinalizeOptions = {}
): ScribeEvent[] {
  const {
    startTime = new Date('2025-10-01T00:00:00Z'),
    stepMs = 60_000,
    baseSeq = 1,
  } = opts;

  const startMs =
    typeof startTime === 'string' || typeof startTime === 'number'
      ? new Date(startTime).getTime()
      : startTime.getTime();

  return prototypes.map((p, i) => {
    const ts = new Date(startMs + i * stepMs).toISOString();
    const seq = baseSeq + i;

    // Construct the discriminated event; TS understands this shape
    return {
      seq,
      ts,
      kind: p.kind,
      payload: p.payload as PayloadOfKind<typeof p.kind>,
    } as ScribeEvent;
  });
}

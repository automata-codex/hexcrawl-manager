import { z } from 'zod';

import { SeasonRolloverEventSchema } from './scribe-event';

/**
 * Schema for validating rollover files (JSONL format).
 *
 * A rollover file must contain exactly one SeasonRolloverEvent with:
 * - kind: 'season_rollover'
 * - payload.seasonId: valid season identifier
 *
 * These files are created by intra-session season changes and consumed by `weave apply trails`.
 */
export const RolloverFileSchema = z
  .array(SeasonRolloverEventSchema)
  .length(1, { message: 'Rollover file must contain exactly one event' });

export type RolloverFile = z.infer<typeof RolloverFileSchema>;

import { z } from 'zod';

/**
 * Schema for rollover footprint files (YAML format).
 *
 * These files are written to `data/session-logs/rollovers/` after applying
 * a rollover (either manual via `scribe rollover` or automatic inter-session).
 *
 * They serve as an audit trail of what happened during the rollover:
 * - Which trails were maintained (near havens)
 * - Which trails persisted (used this season or lucky dice roll)
 * - Which trails were deleted (unused and unlucky dice roll)
 * - Before/after state of all affected trails
 */
export const RolloverFootprintSchema = z.object({
  id: z.string(),
  kind: z.literal('rollover'),
  seasonId: z.string(),
  appliedAt: z.string(),
  inputs: z.object({
    sourceFile: z.string(),
    note: z.string().optional(),
  }),
  effects: z.object({
    rollover: z.object({
      trails: z.record(z.unknown()),
      maintained: z.array(z.string()),
      persisted: z.array(z.string()),
      deletedTrails: z.array(z.string()),
      farChecks: z.record(z.unknown()),
    }),
  }),
  touched: z.object({
    before: z.record(z.unknown()),
    after: z.record(z.unknown()),
  }),
  git: z
    .object({
      headCommit: z.string(),
    })
    .optional(),
});

export type RolloverFootprint = z.infer<typeof RolloverFootprintSchema>;

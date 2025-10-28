import { z } from 'zod';

/**
 * Schema for session footprint files (YAML format).
 *
 * These files are written to `data/session-logs/footprints/trails/` after
 * applying a session to the trails map.
 *
 * They serve as an audit trail of what happened during the session:
 * - Which trails were created (newly marked)
 * - Which trails were rediscovered (re-established after deletion)
 * - Which trails were used (usedFlags map)
 * - Before/after state of all affected trails
 */
export const SessionFootprintSchema = z.object({
  id: z.string(),
  kind: z.literal('session'),
  seasonId: z.string(),
  appliedAt: z.string(),
  inputs: z.object({
    sourceFile: z.string(),
  }),
  effects: z.object({
    session: z.object({
      created: z.array(z.string()),
      usedFlags: z.record(z.boolean()),
      rediscovered: z.array(z.string()),
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

export type SessionFootprint = z.infer<typeof SessionFootprintSchema>;

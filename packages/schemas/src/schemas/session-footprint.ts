import { z } from 'zod';

/**
 * Schema for session footprint files (YAML format).
 *
 * These files are written to `data/session-logs/footprints/<domain>/` after
 * applying a session to a specific domain (trails, hexes, etc.).
 *
 * They serve as an audit trail of what happened during the session.
 * Structure varies by domain - this schema validates the common envelope.
 */
export const SessionFootprintSchema = z.object({
  id: z.string(),
  kind: z.literal('session'),
  // Different domains use different identifiers:
  // - trails: seasonId (e.g., "1511-summer")
  // - hexes: sessionId (e.g., "session-0001_2025-09-20")
  seasonId: z.string().optional(),
  sessionId: z.string().optional(),
  domain: z.string().optional(), // Some domains include this field
  appliedAt: z.string(),
  inputs: z.object({
    sourceFile: z.string(),
  }),
  // Effects structure is domain-specific, so we allow any object
  effects: z.record(z.unknown()),
  touched: z.object({
    before: z.record(z.unknown()),
    after: z.record(z.unknown()),
  }),
  git: z
    .object({
      headCommit: z.string(),
    })
    .optional(),
}).refine(
  (data) => data.seasonId != null || data.sessionId != null,
  {
    message: 'Either seasonId or sessionId must be present',
  },
);

export type SessionFootprint = z.infer<typeof SessionFootprintSchema>;

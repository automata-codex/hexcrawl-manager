import { z } from 'zod';

import { SessionIdSchema } from './session-id.js';

export const ApReasonSchema = z.enum([
  'normal',
  'cap',
  'absence_spend',
  'downtime',
  'correction',
  'grandfathered',
]);

const ApSchema = z.object({
  delta: z.number().int().nonnegative(), // use a separate correction entry if you ever need negatives
  note: z.string().optional(),
  reason: ApReasonSchema.optional(),
});

const AbsenceSpendEntrySchema = z.object({
  kind: z.literal('absence_spend'),
  advancementPoints: z.object({
    combat: ApSchema,
    exploration: ApSchema,
    social: ApSchema,
  }),
  appliedAt: z.string().datetime(),
  characterId: z.string(),
  notes: z.string().optional(),
  sessionId: SessionIdSchema, // when allocate happens outside a session, you’ll attach it to "most recent completed" and set this
});

const SessionApEntrySchema = z.object({
  kind: z.literal('session_ap'),
  advancementPoints: z.object({
    combat: ApSchema,
    exploration: ApSchema,
    social: ApSchema,
  }),
  appliedAt: z.string().datetime(),
  characterId: z.string(),
  sessionId: SessionIdSchema, // ties back to the report id
  source: z.object({ fileHash: z.string() }).optional(), // optional idempotency/audit
});

export const ApLedgerEntrySchema = z.discriminatedUnion('kind', [
  AbsenceSpendEntrySchema,
  SessionApEntrySchema,
]);

export type ApDelta = z.infer<typeof ApSchema>;
export type ApLedgerEntry = z.infer<typeof ApLedgerEntrySchema>;
export type ApReason = z.infer<typeof ApReasonSchema>;

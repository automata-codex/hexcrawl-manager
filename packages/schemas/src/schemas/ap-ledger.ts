import { z } from 'zod';

import { SessionId } from './session-report';

const AbsenceSpendEntrySchema = z.object({
  kind: z.literal('absence_spend'),
  allocations: z.object({
    combat: z.number().int().min(0).default(0),
    exploration: z.number().int().min(0).default(0),
    social: z.number().int().min(0).default(0),
  }),
  appliedAt: z.string().datetime(),
  characterId: z.string(),
  notes: z.string().optional(),
  sessionId: SessionId.optional(), // when allocate happens outside a session, you’ll attach it to "most recent completed" and set this
});

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

const SessionApEntrySchema = z.object({
  kind: z.literal('session_ap'),
  advancementPoints: z.object({
    combat: ApSchema,
    exploration: ApSchema,
    social: ApSchema,
  }),
  appliedAt: z.string().datetime(),
  characterId: z.string(),
  sessionId: SessionId, // ties back to the report id
  source: z.object({ fileHash: z.string() }).optional(), // optional idempotency/audit
});

export const ApLedgerEntrySchema = z.discriminatedUnion('kind', [
  AbsenceSpendEntrySchema,
  SessionApEntrySchema,
]);

export type ApReason = z.infer<typeof ApReasonSchema>;

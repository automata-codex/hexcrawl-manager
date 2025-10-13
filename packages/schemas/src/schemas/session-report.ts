import { z } from 'zod';

import { SessionIdSchema } from './session-id';

const AbsenceAllocationSchema = z.object({
  characterId: z.string(),
  allocations: z.object({
    combat: z.number().int().min(0).default(0),
    exploration: z.number().int().min(0).default(0),
    social: z.number().int().min(0).default(0),
  }),
  notes: z.string().optional(),
});

const ApSchema = z.object({
  number: z.number().int().nonnegative(),
  maxTier: z.number().int().min(1).max(4),
});

const DowntimeSchema = z.object({
  characterId: z.string(),
  kind: z.enum(['crafting', 'training', 'research', 'travel', 'other']),
  notes: z.string().optional(),
});

const GuestCharacter = z.object({
  characterName: z.string(),
  playerName: z.string(),
});

const ScribeId = z.string().regex(/^session_\d{4}[a-z]?_\d{4}-\d{2}-\d{2}$/); // e.g. session_0012_2025-09-15

export const SessionId = z.string().regex(/^session-\d{4}$/); // e.g. session-0012

// Header shared by both planned & completed
const SessionHeader = z.object({
  id: SessionIdSchema, // "session-####"
  absenceAllocations: z.array(AbsenceAllocationSchema).default([]),
  downtime: z.array(DowntimeSchema).default([]),
  gameStartDate: z.string().default(''), // in-world date (free text); GM fills manually
  schemaVersion: z.number().int().min(2).default(2),
  scribeIds: z.array(ScribeId).default([]), // may be empty in planned; must be non-empty before apply
  sessionDate: z.string().default(''), // real-world YYYY-MM-DD; blank in planned, set on completion
  source: z.enum(['scribe', 'import']).default('scribe'),
  createdAt: z.string().datetime().optional(),
});

// Planning-time fields (no AP, no characterIds)
const PlannedSessionReport = SessionHeader.extend({
  status: z.literal('planned'),
  agenda: z.array(z.string()).default([]).optional(),
  gmNotes: z.string().optional(),
});

// Post-apply fields (attendance & AP populated from logs)
const CompletedSessionReport = SessionHeader.extend({
  status: z.literal('completed'),
  advancementPoints: z.object({
    combat: ApSchema,
    exploration: ApSchema,
    social: ApSchema,
  }),
  characterIds: z.array(z.union([z.string(), GuestCharacter])), // PCs are strings; guests are objects. Only string IDs count for attendance/AP.
  fingerprint: z.string(),
  gameEndDate: z.string().default(''),
  notes: z.array(z.string()).default([]),
  todo: z.array(z.string()).default([]),
  weave: z.object({
    appliedAt: z.string().datetime(),
    version: z.string(),
    notes: z.string().optional(),
  }),
});

// Discriminated union on status
export const SessionReportSchema = z.discriminatedUnion('status', [
  PlannedSessionReport,
  CompletedSessionReport,
]);

export type SessionReport = z.infer<typeof SessionReportSchema>;

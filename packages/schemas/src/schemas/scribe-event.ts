import { z } from 'zod';

import { CampaignDateSchema } from './campaign-date';

// Shared fields for all events
const BaseEventSchema = z.object({
  seq: z.number().int().min(1),
  ts: z.string().datetime(),
});

// Individual payload schemas
export const DayEndEventSchema = BaseEventSchema.extend({
  kind: z.literal('day_end'),
  payload: z.object({
    summary: z.object({
      active: z.number().int(),
      daylight: z.number().int(),
      night: z.number().int(),
    }),
  }),
});
export type DayEndEvent = z.infer<typeof DayEndEventSchema>;

export const DayStartEventSchema = BaseEventSchema.extend({
  kind: z.literal('day_start'),
  payload: z.object({
    calendarDate: CampaignDateSchema,
    season: z.string(),
    daylightCap: z.number().int(),
  }),
});
export type DayStartEvent = z.infer<typeof DayStartEventSchema>;

export const DeadReckoningEventSchema = BaseEventSchema.extend({
  kind: z.literal('dead_reckoning'),
  payload: z.object({
    outcome: z.enum(['success', 'failure']),
  }),
});
export type DeadReckoningEvent = z.infer<typeof DeadReckoningEventSchema>;

export const LostEventSchema = BaseEventSchema.extend({
  kind: z.literal('lost'),
  payload: z.object({
    state: z.enum(['on', 'off']),
    reason: z.string().optional(),
  }),
});
export type LostEvent = z.infer<typeof LostEventSchema>;

export const MoveEventSchema = BaseEventSchema.extend({
  kind: z.literal('move'),
  payload: z.object({
    from: z.string(),
    to: z.string(),
    pace: z.enum(['slow', 'normal', 'fast']),
  }),
});
export type MoveEvent = z.infer<typeof MoveEventSchema>;

export const NoteEventSchema = BaseEventSchema.extend({
  kind: z.literal('note'),
  payload: z.object({
    text: z.string(),
    scope: z.enum(['session', 'day']).optional(),
  }),
});
export type NoteEvent = z.infer<typeof NoteEventSchema>;

export const PartySetEventSchema = BaseEventSchema.extend({
  kind: z.literal('party_set'),
  payload: z.object({
    ids: z.array(z.string().min(1)),
  }),
});
export type PartySetEvent = z.infer<typeof PartySetEventSchema>;

export const SeasonRolloverEventSchema = BaseEventSchema.extend({
  kind: z.literal('season_rollover'),
  payload: z.object({
    seasonId: z.string(), // e.g., "1511-spring"
  }),
});
export type SeasonRolloverEvent = z.infer<typeof SeasonRolloverEventSchema>;

export const SessionContinueEventSchema = BaseEventSchema.extend({
  kind: z.literal('session_continue'),
  payload: z.object({
    id: z.string(), // Session ID
    currentDate: CampaignDateSchema.optional(),
    currentHex: z.string(),
    currentParty: z.array(z.string().min(1)),
    status: z.literal('in-progress'),
  }),
});
export type SessionContinueEvent = z.infer<typeof SessionContinueEventSchema>;

export const SessionEndEventSchema = BaseEventSchema.extend({
  kind: z.literal('session_end'),
  payload: z.object({
    id: z.string(), // Session ID
    status: z.literal('final'),
  }),
});
export type SessionEndEvent = z.infer<typeof SessionEndEventSchema>;

export const SessionPauseEventSchema = BaseEventSchema.extend({
  kind: z.literal('session_pause'),
  payload: z.object({
    id: z.string(), // Session ID
    status: z.literal('paused'),
  }),
});
export type SessionPauseEvent = z.infer<typeof SessionPauseEventSchema>;

export const SessionStartEventSchema = BaseEventSchema.extend({
  kind: z.literal('session_start'),
  payload: z.object({
    id: z.string(), // Session ID
    status: z.literal('in-progress'),
    startHex: z.string(),
  }),
});
export type SessionStartEvent = z.infer<typeof SessionStartEventSchema>;

export const TimeLogEventSchema = BaseEventSchema.extend({
  kind: z.literal('time_log'),
  payload: z.object({
    segments: z.number().int(),
    daylightSegments: z.number().int(),
    nightSegments: z.number().int(),
    phase: z.enum(['daylight', 'night']),
    note: z.string().optional(),
  }),
});
export type TimeLogEvent = z.infer<typeof TimeLogEventSchema>;

export const TrailEventSchema = BaseEventSchema.extend({
  kind: z.literal('trail'),
  payload: z.object({
    from: z.string(),
    to: z.string(),
    marked: z.boolean(),
  }),
});
export type TrailEvent = z.infer<typeof TrailEventSchema>;

// Full discriminated union
export const ScribeEventSchema = z.discriminatedUnion('kind', [
  DayEndEventSchema,
  DayStartEventSchema,
  DeadReckoningEventSchema,
  LostEventSchema,
  MoveEventSchema,
  NoteEventSchema,
  PartySetEventSchema,
  SeasonRolloverEventSchema,
  SessionContinueEventSchema,
  SessionEndEventSchema,
  SessionPauseEventSchema,
  SessionStartEventSchema,
  TimeLogEventSchema,
  TrailEventSchema,
]);

export type ScribeEvent = z.infer<typeof ScribeEventSchema>;
export type ScribeEventKind = ScribeEvent['kind'];
export type ScribeEventPayload = ScribeEvent['payload'];
export type ScribeEventOfKind<K extends ScribeEventKind> = Extract<ScribeEvent, { kind: K }>;

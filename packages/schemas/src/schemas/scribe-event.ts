import { z } from 'zod';

import { CampaignDateSchema } from './campaign-date';

/* -------------------------------------------------------------
 * Base & helpers
 * -------------------------------------------------------------*/

/** Shared fields for all events */
export const BaseEventSchema = z.object({
  seq: z.number().int().min(1),
  ts: z.string().datetime(),
});

/** Helper to compose a full event schema from a literal kind and a payload schema */
export function makeEventSchema<const K extends string, P extends z.ZodTypeAny>(
  kind: K,
  payload: P,
) {
  return BaseEventSchema.extend({
    kind: z.literal(kind),
    payload,
  });
}

/* -------------------------------------------------------------
 * Log headers
 * -------------------------------------------------------------*/

export const ScribeHeaderSchema = z.object({
  kind: z.literal('header'),
  payload: z.object({
    id: z.string(),
    seasonId: z.string(),
    inWorldStart: CampaignDateSchema,
    inWorldEnd: CampaignDateSchema,
  }),
});

export type ScribeHeader = z.infer<typeof ScribeHeaderSchema>;

/* -------------------------------------------------------------
 * Payload schemas (one per event)
 * -------------------------------------------------------------*/

export const AdvancementPointEventPayloadSchema = z.object({
  pillar: z.string(),
  tier: z.number().int(),
  note: z.string().optional(),
  at: z.object({
    hex: z.string().nullable(),
    party: z.array(z.string()),
  }),
});
export type AdvancementPointEventPayload = z.infer<
  typeof AdvancementPointEventPayloadSchema
>;

export const BacktrackEventPayloadSchema = z.object({
  pace: z.enum(['slow', 'normal', 'fast']),
});
export type BacktrackEventPayload = z.infer<typeof BacktrackEventPayloadSchema>;

export const DateSetEventPayloadSchema = z.object({
  calendarDate: CampaignDateSchema,
});
export type DateSetEventPayload = z.infer<typeof DateSetEventPayloadSchema>;

export const DayEndEventPayloadSchema = z.object({
  summary: z.object({
    active: z.number().int(),
    daylight: z.number().int(),
    night: z.number().int(),
  }),
});
export type DayEndEventPayload = z.infer<typeof DayEndEventPayloadSchema>;

export const DayStartEventPayloadSchema = z.object({
  calendarDate: CampaignDateSchema,
  season: z.string(),
  daylightCap: z.number().int(),
});
export type DayStartEventPayload = z.infer<typeof DayStartEventPayloadSchema>;

export const DeadReckoningEventPayloadSchema = z.object({
  outcome: z.enum(['success', 'failure']),
});
export type DeadReckoningEventPayload = z.infer<
  typeof DeadReckoningEventPayloadSchema
>;

export const ExploreEventPayloadSchema = z.object({
  target: z.string(), // The party's current hex
});
export type ExploreEventPayload = z.infer<typeof ExploreEventPayloadSchema>;

export const LostEventPayloadSchema = z.object({
  state: z.enum(['on', 'off']),
  reason: z.string().optional(),
});
export type LostEventPayload = z.infer<typeof LostEventPayloadSchema>;

export const MoveEventPayloadSchema = z.object({
  from: z.string().nullable(),
  to: z.string(),
  pace: z.enum(['slow', 'normal', 'fast']),
});
export type MoveEventPayload = z.infer<typeof MoveEventPayloadSchema>;

export const NoteEventPayloadSchema = z.object({
  text: z.string(),
  scope: z.enum(['session', 'day']).optional(),
});
export type NoteEventPayload = z.infer<typeof NoteEventPayloadSchema>;

export const PartySetEventPayloadSchema = z.object({
  ids: z.array(z.string().min(1)),
});
export type PartySetEventPayload = z.infer<typeof PartySetEventPayloadSchema>;

export const ScoutEventPayloadSchema = z.object({
  from: z.string(),
  target: z.string(),
  reveal: z.object({
    terrain: z.boolean(),
    vegetation: z.boolean(),
    landmark: z.boolean(),
  }),
});
export type ScoutEventPayload = z.infer<typeof ScoutEventPayloadSchema>;

export const SeasonRolloverEventPayloadSchema = z.object({
  seasonId: z.string(), // e.g., "1511-spring"
});
export type SeasonRolloverEventPayload = z.infer<
  typeof SeasonRolloverEventPayloadSchema
>;

export const SessionContinueEventPayloadSchema = z.object({
  id: z.string(), // Session ID
  currentDate: CampaignDateSchema.optional(),
  currentHex: z.string(),
  currentParty: z.array(z.string().min(1)),
  sessionDate: z.string().date(),
  status: z.literal('in-progress'),
});
export type SessionContinueEventPayload = z.infer<
  typeof SessionContinueEventPayloadSchema
>;

export const SessionEndEventPayloadSchema = z.object({
  id: z.string(), // Session ID
  status: z.literal('final'),
});
export type SessionEndEventPayload = z.infer<
  typeof SessionEndEventPayloadSchema
>;

export const SessionPauseEventPayloadSchema = z.object({
  id: z.string(), // Session ID
  status: z.literal('paused'),
});
export type SessionPauseEventPayload = z.infer<
  typeof SessionPauseEventPayloadSchema
>;

export const SessionStartEventPayloadSchema = z.object({
  id: z.string(), // Session ID
  sessionDate: z.string().date(),
  status: z.literal('in-progress'),
  startHex: z.string(),
});
export type SessionStartEventPayload = z.infer<
  typeof SessionStartEventPayloadSchema
>;

export const TimeLogEventPayloadSchema = z.object({
  segments: z.number().int(),
  daylightSegments: z.number().int(),
  nightSegments: z.number().int(),
  phase: z.enum(['daylight', 'night']),
  note: z.string().optional(),
});
export type TimeLogEventPayload = z.infer<typeof TimeLogEventPayloadSchema>;

export const TodoEventPayloadSchema = z.object({
  text: z.string(),
});
export type TodoEventPayload = z.infer<typeof TodoEventPayloadSchema>;

export const TrailEventPayloadSchema = z.object({
  from: z.string(),
  to: z.string(),
  marked: z.boolean(),
});
export type TrailEventPayload = z.infer<typeof TrailEventPayloadSchema>;

export const WeatherCommittedEventPayloadSchema = z.object({
  date: CampaignDateSchema,
  season: z.string(),
  roll2d6: z.number().int().min(2).max(12),
  forecastBefore: z.number().int().min(0),
  total: z.number().int(),
  category: z.string(),
  detail: z.string().nullable().optional(), // null in your samples; allow absent too
  descriptors: z.array(z.string()).optional(), // present or omitted in samples
  forecastAfter: z.number().int().min(0),
});
export type WeatherCommittedEventPayload = z.infer<
  typeof WeatherCommittedEventPayloadSchema
>;

/* -------------------------------------------------------------
 * Full event schemas (compose base + kind + payload)
 * -------------------------------------------------------------*/

export const AdvancementPointEventSchema = makeEventSchema(
  'advancement_point',
  AdvancementPointEventPayloadSchema,
);
export type AdvancementPointEvent = z.infer<typeof AdvancementPointEventSchema>;

export const BacktrackEventSchema = makeEventSchema(
  'backtrack',
  BacktrackEventPayloadSchema,
);
export type BacktrackEvent = z.infer<typeof BacktrackEventSchema>;

export const DateSetEventSchema = makeEventSchema(
  'date_set',
  DateSetEventPayloadSchema,
);
export type DateSetEvent = z.infer<typeof DateSetEventSchema>;

export const DayEndEventSchema = makeEventSchema(
  'day_end',
  DayEndEventPayloadSchema,
);
export type DayEndEvent = z.infer<typeof DayEndEventSchema>;

export const DayStartEventSchema = makeEventSchema(
  'day_start',
  DayStartEventPayloadSchema,
);
export type DayStartEvent = z.infer<typeof DayStartEventSchema>;

export const DeadReckoningEventSchema = makeEventSchema(
  'dead_reckoning',
  DeadReckoningEventPayloadSchema,
);
export type DeadReckoningEvent = z.infer<typeof DeadReckoningEventSchema>;

export const ExploreEventSchema = makeEventSchema(
  'explore',
  ExploreEventPayloadSchema,
);
export type ExploreEvent = z.infer<typeof ExploreEventSchema>;

export const LostEventSchema = makeEventSchema('lost', LostEventPayloadSchema);
export type LostEvent = z.infer<typeof LostEventSchema>;

export const MoveEventSchema = makeEventSchema('move', MoveEventPayloadSchema);
export type MoveEvent = z.infer<typeof MoveEventSchema>;

export const NoteEventSchema = makeEventSchema('note', NoteEventPayloadSchema);
export type NoteEvent = z.infer<typeof NoteEventSchema>;

export const PartySetEventSchema = makeEventSchema(
  'party_set',
  PartySetEventPayloadSchema,
);
export type PartySetEvent = z.infer<typeof PartySetEventSchema>;

export const ScoutEventSchema = makeEventSchema(
  'scout',
  ScoutEventPayloadSchema,
);
export type ScoutEvent = z.infer<typeof ScoutEventSchema>;

export const SeasonRolloverEventSchema = makeEventSchema(
  'season_rollover',
  SeasonRolloverEventPayloadSchema,
);
export type SeasonRolloverEvent = z.infer<typeof SeasonRolloverEventSchema>;

export const SessionContinueEventSchema = makeEventSchema(
  'session_continue',
  SessionContinueEventPayloadSchema,
);
export type SessionContinueEvent = z.infer<typeof SessionContinueEventSchema>;

export const SessionEndEventSchema = makeEventSchema(
  'session_end',
  SessionEndEventPayloadSchema,
);
export type SessionEndEvent = z.infer<typeof SessionEndEventSchema>;

export const SessionPauseEventSchema = makeEventSchema(
  'session_pause',
  SessionPauseEventPayloadSchema,
);
export type SessionPauseEvent = z.infer<typeof SessionPauseEventSchema>;

export const SessionStartEventSchema = makeEventSchema(
  'session_start',
  SessionStartEventPayloadSchema,
);
export type SessionStartEvent = z.infer<typeof SessionStartEventSchema>;

export const TimeLogEventSchema = makeEventSchema(
  'time_log',
  TimeLogEventPayloadSchema,
);
export type TimeLogEvent = z.infer<typeof TimeLogEventSchema>;

export const TodoEventSchema = makeEventSchema('todo', TodoEventPayloadSchema);
export type TodoEvent = z.infer<typeof TodoEventSchema>;

export const TrailEventSchema = makeEventSchema(
  'trail',
  TrailEventPayloadSchema,
);
export type TrailEvent = z.infer<typeof TrailEventSchema>;

export const WeatherCommittedEventSchema = makeEventSchema(
  'weather_committed',
  WeatherCommittedEventPayloadSchema,
);
export type WeatherCommittedEvent = z.infer<typeof WeatherCommittedEventSchema>;

/* -------------------------------------------------------------
 * Union & derived utility types
 * -------------------------------------------------------------*/

export const ScribeEventSchema = z.discriminatedUnion('kind', [
  AdvancementPointEventSchema,
  BacktrackEventSchema,
  DateSetEventSchema,
  DayEndEventSchema,
  DayStartEventSchema,
  DeadReckoningEventSchema,
  ExploreEventSchema,
  LostEventSchema,
  MoveEventSchema,
  NoteEventSchema,
  PartySetEventSchema,
  ScoutEventSchema,
  SeasonRolloverEventSchema,
  SessionContinueEventSchema,
  SessionEndEventSchema,
  SessionPauseEventSchema,
  SessionStartEventSchema,
  TimeLogEventSchema,
  TodoEventSchema,
  TrailEventSchema,
  WeatherCommittedEventSchema,
]);

export type ScribeEvent = z.infer<typeof ScribeEventSchema>;
export type ScribeEventKind = ScribeEvent['kind'];
export type ScribeEventOfKind<K extends ScribeEventKind> = Extract<
  ScribeEvent,
  { kind: K }
>;
export type PayloadOfKind<K extends ScribeEventKind> =
  ScribeEventOfKind<K>['payload'];
export type ScribeEventPayload = ScribeEvent['payload'];

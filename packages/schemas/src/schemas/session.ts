import { z } from 'zod';

const ApSchema = z.object({
  number: z.union([z.number().int().nonnegative(), z.literal('-')]),
  maxTier: z.number().int().min(1).max(4),
});

const GuestCharacterSchema = z.object({
  characterName: z.string(),
  playerName: z.string(),
});

export const SessionSchema = z.object({
  id: z.string(),
  sessionDate: z.string().date(),
  gameDates: z.string(),
  characterIds: z.array(z.union([z.string(), GuestCharacterSchema])),
  agenda: z.array(z.string()).optional(), // Things to do in this session
  advancementPoints: z.object({
    combat: ApSchema,
    exploration: ApSchema,
    social: ApSchema,
  }),
  events: z.array(z.string()).optional(), // What happened in this session
});

export type SessionData = z.infer<typeof SessionSchema>;

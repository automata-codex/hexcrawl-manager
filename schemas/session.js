import { z } from 'zod';

const ApSchema = z.object({
  number: z.number().int().nonnegative(),
  maxTier: z.number().int().min(1).max(4),
})

export const SessionSchema = z.object({
  id: z.string(),
  sessionDate: z.string().date(),
  gameDates: z.string(),
  characterIds: z.array(z.string()),
  agenda: z.array(z.string()).optional(), // Things to do in this session
  advancementPoints: z.object({
    combat: ApSchema,
    exploration: ApSchema,
    social: ApSchema,
  }),
  events: z.array(z.string()).optional(), // What happened in this session
});

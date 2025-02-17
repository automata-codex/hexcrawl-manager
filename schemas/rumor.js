import { z } from 'zod';

export const RumorSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['true', 'false', 'misleading']),
  notes: z.array(z.string()).optional(),
  isKnown: z.boolean().optional(), // `true` if the players have heard this rumor before (`false` by default)
  isAvailable: z.boolean().optional(), // `true` if this rumor is available for the players to hear (`true` by default)
});

export const RumorListSchema = z.array(RumorSchema);

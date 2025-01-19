import { z } from 'zod';

export const RumorSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['true', 'false', 'misleading']),
  notes: z.array(z.string()).optional(),
  completed: z.boolean().optional(),
});

export const RumorListSchema = z.array(RumorSchema);

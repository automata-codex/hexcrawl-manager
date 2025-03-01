import { z } from 'zod';

export const BountySchema = z.object({
  id: z.string(),
  title: z.string(),
  poster: z.string(),
  text: z.string(),
  notes: z.string().optional(),
  statBlocks: z.array(z.string()),
});

export const BountyListSchema = z.array(BountySchema);

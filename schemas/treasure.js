import { z } from 'zod';

export const TreasureSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  treasure: z.string(),
});

export const TreasureListSchema = z.array(TreasureSchema);

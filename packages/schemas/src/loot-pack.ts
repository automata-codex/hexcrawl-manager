import { z } from 'zod';

export const LootPackSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  treasure: z.string(),
});

export const LootPackListSchema = z.array(LootPackSchema);

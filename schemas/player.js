import { z } from 'zod';

export const PlayerSchema = z.object({
  id: z.string(),
  slug: z.string(),
  displayName: z.string(),
  pronouns: z.string(),
});

export const PlayerListSchema = z.array(PlayerSchema);

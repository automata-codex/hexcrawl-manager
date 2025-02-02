import { z } from 'zod';

export const FactionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(), // aka "faction identity"
  areaOfOperation: z.array(z.string()),
  powerLevel: z.string(),
  ideology: z.string(),
});

export const FactionListSchema = z.array(FactionSchema);

import { z } from 'zod';

export const FactionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(), // aka "faction identity"
  areaOfOperation: z.union([z.string(), z.array(z.string())]),
  powerLevel: z.union([z.string(), z.array(z.string())]),
  ideology: z.union([z.string(), z.array(z.string())]),
});

export const FactionListSchema = z.array(FactionSchema);

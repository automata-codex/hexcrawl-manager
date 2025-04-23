import { z } from 'zod';

export const EncounterSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  statBlocks: z.array(z.string()),
  weight: z.number().default(1),
}).describe('Detail about a random encounter');

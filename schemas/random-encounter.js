import { z } from 'zod';

export const RandomEncounterSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  statBlocks: z.array(z.string())
}).describe('Detail about a random encounter');

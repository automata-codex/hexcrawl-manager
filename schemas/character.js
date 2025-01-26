import { z } from 'zod';

export const CharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  playerId: z.string(),
  class: z.string().optional(),
  species: z.string(),
  culture: z.string(),
  pronouns: z.string(),
  image: z.string().optional(),
  notes: z.array(z.string()).optional(),
});

import { z } from 'zod';
import { ClassEnum } from './class-enum.js';

export const CharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  pronouns: z.string(),
  playerId: z.string(),
  species: z.string(),
  culture: z.string(),
  class: ClassEnum,
  subclass: z.string().optional(),
  level: z.number().int().max(20).min(1),
  image: z.string().optional(),
  notes: z.array(z.string()).optional(),
});

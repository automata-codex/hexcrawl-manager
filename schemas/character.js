import { z } from 'zod';
import { ClassEnum } from './class-enum.js';

export const CharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  playerId: z.string(),
  class: ClassEnum,
  subclass: z.string().optional(),
  species: z.string(),
  culture: z.string(),
  pronouns: z.string(),
  level: z.number().int().max(20).min(1),
  image: z.string().optional(),
  notes: z.array(z.string()).optional(),
});

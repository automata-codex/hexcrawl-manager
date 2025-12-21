import { z } from 'zod';

import { ClassEnum } from './class-enum.js';
import { ClueReferencesSchema } from './clue-reference.js';

export const NpcSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string().optional(),
  occupation: z.string(),
  class: ClassEnum.optional(),
  adventuringCompany: z.string().optional(),
  species: z.string(),
  culture: z.string(),
  pronouns: z.string(),
  description: z.string(),
  image: z.string().optional(),
  notes: z.array(z.string()).optional(),
  clues: ClueReferencesSchema.describe('IDs of clues this NPC knows or can reveal'),
});

export type NpcData = z.infer<typeof NpcSchema>;

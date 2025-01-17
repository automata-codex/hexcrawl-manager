import { z } from 'zod';

export const NpcDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string().optional(),
  occupation: z.string(),
  class: z.string().optional(),
  adventuringCompany: z.string().optional(),
  species: z.string(),
  culture: z.string(),
  pronouns: z.string(),
  description: z.string(),
  image: z.string().optional(),
  notes: z.array(z.string()).optional(),
});

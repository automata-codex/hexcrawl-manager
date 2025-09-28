import { z } from 'zod';

export const SubclassSchema = z.object({
  name: z.string(),
  source: z.enum(['phb', 'tcoe', 'toh', 'xgte']),
  page: z.number().optional(),
});

export const ClassSchema = z.object({
  id: z.string(),
  name: z.string(),
  subclasses: z.array(SubclassSchema),
});

export type ClassData = z.infer<typeof ClassSchema>;

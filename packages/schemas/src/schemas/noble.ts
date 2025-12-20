import { z } from 'zod';

export const NobleRankEnum = z.enum([
  'king',
  'queen',
  'prince',
  'princess',
  'duke',
  'marquess',
  'earl',
  'viscount',
  'baron',
  'knight',
]);

export const NobleSchema = z.object({
  id: z.string(),
  name: z.string(),
  pronouns: z.string(),
  title: NobleRankEnum,
  displayTitle: z.string().optional(),
  description: z.string().optional(),
  gmNotes: z.string().optional(),
  secret: z.boolean().optional(),
  liege: z.string().nullable(),
  factions: z.array(z.string()).optional(),
  house: z.string().optional(),
});

export type NobleData = z.infer<typeof NobleSchema>;
export type NobleRank = z.infer<typeof NobleRankEnum>;

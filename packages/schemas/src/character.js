import { z } from 'zod';

import { ClassEnum } from './class-enum.js';

export const CharacterSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  displayName: z.string(),
  pronouns: z.string(),
  playerId: z.string(),
  species: z.string(),
  culture: z.string(),
  class: ClassEnum,
  subclass: z.string().optional(),
  level: z.number().int().max(20).min(1),
  image: z.string().optional(),
  advancementPoints: z.object({
    combat: z.number().int().nonnegative(),
    exploration: z.number().int().nonnegative(),
    social: z.number().int().nonnegative(),
  }),
  backstoryTitle: z.string().optional(), // Optional title for GM-only backstory
  backstory: z.string().optional(), // GM-only backstory in Markdown
  goals: z.string().optional(), // GM-only goals in Markdown
  notes: z.string().optional(), // GM-only notes in Markdown
});

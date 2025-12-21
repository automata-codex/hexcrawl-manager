import { z } from 'zod';

import { ClueReferencesSchema } from './clue-reference.js';

export const PlotlineStatusEnum = z.enum(['active', 'dormant', 'resolved']);

export const PlotlineSchema = z.object({
  slug: z.string(),
  status: PlotlineStatusEnum.default('active'),
  summary: z.string().optional(),
  title: z.string(),
  clues: ClueReferencesSchema.describe('IDs of clues placed in this plotline'),
});

export type PlotlineData = z.infer<typeof PlotlineSchema>;
export type PlotlineStatus = z.infer<typeof PlotlineStatusEnum>;

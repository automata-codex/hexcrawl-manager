import { z } from 'zod';

import { CampaignStatusEnum } from './campaign-status.js';
import { ClueReferencesSchema } from './clue-reference.js';

export const PlotlineStatusEnum = z.enum(['active', 'dormant', 'resolved']);

export const PlotlineBeatStatusEnum = z.enum([
  'pending',
  'active',
  'resolved',
  'skipped',
]);

export const PlotlineBeatSchema = z.object({
  title: z.string(),
  status: PlotlineBeatStatusEnum.default('pending'),
  trigger: z.string().optional().describe(
    'Free-text condition for when this beat activates',
  ),
  factions: z.array(z.string()).optional().describe(
    'Faction IDs driving this beat',
  ),
  npcs: z.array(z.string()).optional().describe(
    'NPC IDs driving this beat',
  ),
  clues: ClueReferencesSchema.describe(
    'Clues associated with this beat',
  ),
  notes: z.string().optional(),
});

export const PlotlineSchema = z.object({
  slug: z.string(),
  status: PlotlineStatusEnum.default('active'),
  summary: z.string().optional(),
  title: z.string(),
  beats: z.array(PlotlineBeatSchema).optional(),
  beatRefs: z
    .array(z.string())
    .optional()
    .describe(
      'Ordered bare slugs of beats in the beats collection. The order is the canonical beat sequence. Renames to `beats` after the inline field is removed.',
    ),
  campaignStatus: CampaignStatusEnum.default('active'),
});

export type PlotlineData = z.infer<typeof PlotlineSchema>;
export type PlotlineStatus = z.infer<typeof PlotlineStatusEnum>;
export type PlotlineBeatData = z.infer<typeof PlotlineBeatSchema>;
export type PlotlineBeatStatus = z.infer<typeof PlotlineBeatStatusEnum>;

import { z } from 'zod';

import { CampaignStatusEnum } from './campaign-status.js';
import { ClueReferencesSchema } from './clue-reference.js';
import { PlotlineBeatStatusEnum } from './plotline.js';

export const BeatSchema = z
  .object({
    slug: z.string(),
    title: z.string(),
    plotline: z
      .string()
      .describe(
        'Slug of the parent plotline. Redundant with the file path but explicit for validation and reverse-lookup.',
      ),
    status: PlotlineBeatStatusEnum.default('pending'),
    trigger: z
      .string()
      .optional()
      .describe('Free-text condition for when this beat activates'),
    factions: z
      .array(z.string())
      .optional()
      .describe('Faction slugs driving this beat'),
    npcs: z
      .array(z.string())
      .optional()
      .describe('NPC slugs driving this beat'),
    clues: ClueReferencesSchema.describe('Clues associated with this beat'),
    campaignStatus: CampaignStatusEnum.default('active'),
  })
  .describe('BeatSchema');

export type BeatData = z.infer<typeof BeatSchema>;

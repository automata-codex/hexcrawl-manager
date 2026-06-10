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
    tags: z
      .array(z.string())
      .optional()
      .describe(
        'Free-form tags for at-the-table lookup (location, situation, encounter context)',
      ),
    clues: ClueReferencesSchema.describe('Clues associated with this beat'),
    campaignStatus: CampaignStatusEnum.default('active'),
  })
  .describe(
    "A beat is a structural inflection point in a single plotline's arc — one " +
    "node in that plotline's ordered `beats` sequence, used for pacing and for " +
    'tracking where the story stands. A beat may be realized through one or more ' +
    'encounters and may surface clues, but it is the narrative node, not the ' +
    'runnable scene (encounter) or the fact learned (clue). Rule of thumb: a ' +
    "one-time position in a single plotline's progression is a beat; a reusable " +
    'scene that could appear in more than one plotline is an encounter.',
  );

export type BeatData = z.infer<typeof BeatSchema>;

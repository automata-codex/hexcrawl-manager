import { z } from 'zod';

import { CampaignStatusEnum } from './campaign-status.js';

export const PlotlineStatusEnum = z.enum(['active', 'dormant', 'resolved']);

export const PlotlineBeatStatusEnum = z.enum([
  'pending',
  'active',
  'resolved',
  'skipped',
]);

export const PlotlineSchema = z.object({
  slug: z.string(),
  status: PlotlineStatusEnum.default('active'),
  summary: z.string().optional(),
  blurb: z
    .string()
    .optional()
    .describe(
      'Short text shown on the plotlines index card. When omitted, the summary is shown on the card instead.',
    ),
  title: z.string(),
  beats: z
    .array(z.string())
    .optional()
    .describe(
      'Ordered bare slugs of beats in the beats collection. The order is the canonical beat sequence.',
    ),
  campaignStatus: CampaignStatusEnum.default('active'),
});

export type PlotlineData = z.infer<typeof PlotlineSchema>;
export type PlotlineStatus = z.infer<typeof PlotlineStatusEnum>;
export type PlotlineBeatStatus = z.infer<typeof PlotlineBeatStatusEnum>;

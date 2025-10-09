import { z } from 'zod';

import { MONTH_NAMES } from '../constants';

export const CampaignDateSchema = z.object({
  day: z.number().int().min(1).max(31),
  month: z.enum(MONTH_NAMES),
  year: z.number().int(),
});

export type CampaignDate = z.infer<typeof CampaignDateSchema>;
export type Month = (typeof MONTH_NAMES)[number];

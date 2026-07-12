import { z } from 'zod';

export const CampaignStatusEnum = z.enum(['active', 'inactive']);
export type CampaignStatus = z.infer<typeof CampaignStatusEnum>;

export function isActive(content: { campaignStatus?: CampaignStatus }): boolean {
  return (content.campaignStatus ?? 'active') === 'active';
}

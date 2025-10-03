import type { CampaignDate } from '@skyreach/schemas';

export function formatDate(d: CampaignDate | null): string {
  if (!d) {
    return 'unknown';
  }
  return `${d.day} ${d.month} ${d.year}`;
}

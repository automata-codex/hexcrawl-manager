import type { CampaignDate } from '@skyreach/schemas';

export function datesEqual(
  a: CampaignDate | null,
  b: CampaignDate | null,
): boolean {
  if (!a || !b) {
    return false;
  }
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

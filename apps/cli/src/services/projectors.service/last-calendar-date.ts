import type { CampaignDate, ScribeEvent } from '@skyreach/schemas';

export function lastCalendarDate(events: ScribeEvent[]): CampaignDate | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.kind === 'day_start' && (e as any).payload?.calendarDate) {
      return (e as any).payload.calendarDate as CampaignDate;
    }
    if (e.kind === 'date_set' && (e as any).payload?.calendarDate) {
      return (e as any).payload.calendarDate as CampaignDate;
    }
  }
  return null;
}

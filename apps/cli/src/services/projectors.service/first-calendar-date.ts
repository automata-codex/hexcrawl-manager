import type { CampaignDate, ScribeEvent } from '@achm/schemas';

export function firstCalendarDate(events: ScribeEvent[]): CampaignDate | null {
  for (let i = 0; i < events.length; i++) {
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

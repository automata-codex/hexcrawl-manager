import { appendEvent } from '../../../../services/event-log.service';

import type { CampaignDate } from '@skyreach/schemas';

/**
 * Emit a day_start event.
 * @returns The sequence number of the emitted event
 */
export function emitDayStart(
  file: string,
  date: CampaignDate,
  season: string,
  daylightCapHours: number,
): number {
  const event = appendEvent(file, 'day_start', {
    calendarDate: date,
    season,
    daylightCap: daylightCapHours,
  });
  return event.seq;
}

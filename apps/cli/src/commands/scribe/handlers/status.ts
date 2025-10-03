import { info } from '@skyreach/cli-kit';
import { segmentsToHours } from '@skyreach/core';

import { readEvents } from '../../../services/event-log.service';
import {
  activeSegmentsSinceStart,
  daylightSegmentsSinceStart,
  findOpenDay,
  isPartyLost,
  selectCurrentHex,
} from '../projectors';
import { requireFile } from '../services/general';

import type { Context } from '../types';

export default function status(ctx: Context) {
  return (_args: string[]) => {
    if (!requireFile(ctx)) return;

    const events = readEvents(ctx.file!); // checked by requireFile
    const hex = selectCurrentHex(events) ?? '(unknown)';
    const lostState = isPartyLost(events) ? 'ON' : 'OFF';

    const { open, lastStartIdx } = findOpenDay(events);

    if (!open) {
      return info(
        [
          `📍 Hex: ${hex}`,
          `❌ No open day. Start one with: day start [date]`,
        ].join('\n'),
      );
    }

    const dayStart = events[lastStartIdx] as any;
    const calendarDate = dayStart.payload?.calendarDate;
    const daylightCapH = Number(dayStart.payload?.daylightCap ?? 0);

    const usedDaylightSegments = daylightSegmentsSinceStart(
      events,
      lastStartIdx,
    );
    const usedActiveSegments = activeSegmentsSinceStart(events, lastStartIdx);

    const usedDaylightH = segmentsToHours(usedDaylightSegments);
    const usedActiveH = segmentsToHours(usedActiveSegments);

    const EXHAUSTION_CAP_H = 12;

    let out = [
      `📍 Hex: ${hex}`,
      `🧭 Lost: ${lostState}`,
      `📅 Date: ${calendarDate ? ctx.calendar.formatDate(calendarDate) : '(unset)'}`,
      `☀️ Daylight: ${usedDaylightH.toFixed(1)}h / ${daylightCapH}h`,
      `💪 Active: ${usedActiveH.toFixed(1)}h / ${EXHAUSTION_CAP_H}h`,
    ].join('\n');

    if (usedActiveH > EXHAUSTION_CAP_H) {
      out += `\n⚠️ Exceeded 12h exhaustion threshold`;
    }

    return info(out);
  };
}

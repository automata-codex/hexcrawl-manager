import { info } from '@achm/cli-kit';
import { getDaylightCapSegments, segmentsToHours } from '@achm/core';

import { readEvents } from '../../../../services/event-log.service';
import { lastCalendarDate } from '../../../../services/projectors.service';
import { ACTIVITY_CAP_SEGMENTS } from '../../lib/core/execute-leg';
import { loadPlan } from '../../lib/core/fast-travel-plan';
import { requireSession } from '../../services/general';

import type { Context } from '../../types';

export default function fastTravelStatus(ctx: Context) {
  if (!requireSession(ctx)) {
    return;
  }

  const plan = loadPlan(ctx.sessionId!);
  if (!plan) {
    info('No active fast travel plan.');
    return;
  }

  // Display plan status
  info(`\n=== Fast Travel Plan ===`);
  info(`Destination: ${plan.destHex}`);
  info(`Pace: ${plan.pace}`);
  info(`Route: ${plan.route.join(' → ')}`);
  info(`Progress: ${plan.legIndex} / ${plan.route.length} legs completed`);

  if (plan.legIndex < plan.route.length) {
    const remaining = plan.route.slice(plan.legIndex);
    info(`Remaining: ${remaining.join(' → ')}`);
  }

  info(`\nToday's Activity:`);
  info(
    `  Active segments: ${plan.activeSegmentsToday} / ${ACTIVITY_CAP_SEGMENTS} (${segmentsToHours(plan.activeSegmentsToday)}h / ${segmentsToHours(ACTIVITY_CAP_SEGMENTS)}h)`,
  );
  info(
    `  Daylight left: ${plan.daylightSegmentsLeft} segments (${segmentsToHours(plan.daylightSegmentsLeft)}h)`,
  );

  // Show the day's daylight envelope (season-derived from the current date)
  if (ctx.file) {
    const currentDate = lastCalendarDate(readEvents(ctx.file));
    if (currentDate) {
      const daylightCapSegments = getDaylightCapSegments(currentDate);
      info(
        `  Daylight envelope: ${daylightCapSegments} segments (${segmentsToHours(daylightCapSegments)}h)`,
      );
    }
  }

  info(`\nPlan ID: ${plan.groupId}`);
}

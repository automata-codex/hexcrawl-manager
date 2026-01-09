import { info } from '@achm/cli-kit';
import { segmentsToHours } from '@achm/core';

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
    `  Active segments: ${plan.activeSegmentsToday} / 16 (${segmentsToHours(plan.activeSegmentsToday)}h / 8h)`,
  );
  info(
    `  Daylight left: ${plan.daylightSegmentsLeft} segments (${segmentsToHours(plan.daylightSegmentsLeft)}h)`,
  );

  info(`\nPlan ID: ${plan.groupId}`);
}

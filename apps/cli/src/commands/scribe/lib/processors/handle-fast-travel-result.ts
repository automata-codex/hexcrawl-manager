import { error, info } from '@achm/cli-kit';
import { getDaylightCapSegments, segmentsToHours } from '@achm/core';

import { readEvents } from '../../../../services/event-log.service';
import { lastCalendarDate } from '../../../../services/projectors.service';
import {
  deletePlan,
  expectedResumeHex,
  savePlan,
} from '../core/fast-travel-plan';

import type { FastTravelResult } from '../core/fast-travel-runner';
import type { FastTravelPlan } from '../types/fast-travel';

/**
 * Handle the result of fast travel execution, updating the plan and displaying messages.
 */
export function handleFastTravelResult(
  file: string,
  sessionId: string,
  plan: FastTravelPlan,
  result: FastTravelResult,
) {
  if (result.status === 'completed') {
    deletePlan(sessionId);
    info(`Fast travel complete! Arrived at ${plan.destHex}.`);
    info(
      `Total time today: ${segmentsToHours(result.finalSegments.active)}h active, ${segmentsToHours(result.finalSegments.daylight)}h daylight`,
    );
  } else if (result.status === 'paused_encounter') {
    // Update plan with current progress
    plan.legIndex = result.currentLegIndex;
    plan.activeSegmentsToday = result.finalSegments.active;

    // Recalculate daylight left from current events
    const events = readEvents(file);
    const currentDate = lastCalendarDate(events);
    if (!currentDate) {
      throw new Error(
        'No calendar date found in events while handling fast-travel encounter pause.',
      );
    }
    const daylightCapSegments = getDaylightCapSegments(currentDate);
    plan.daylightSegmentsLeft =
      daylightCapSegments - result.finalSegments.daylight;

    savePlan(plan);
    // The party halts before entering the encounter hex.
    info(
      `Encounter entering ${plan.route[plan.legIndex]}! Fast travel paused at ${expectedResumeHex(plan)}. Use \`fast resume\` to continue after resolving the encounter.`,
    );
  } else if (result.status === 'paused_no_capacity') {
    // Update plan with current progress
    plan.legIndex = result.currentLegIndex;
    plan.activeSegmentsToday = result.finalSegments.active;

    // Recalculate daylight left from current events
    const events = readEvents(file);
    const currentDate = lastCalendarDate(events);
    if (!currentDate) {
      throw new Error(
        'No calendar date found in events while handling fast-travel no-capacity pause.',
      );
    }
    const daylightCapSegments = getDaylightCapSegments(currentDate);
    plan.daylightSegmentsLeft =
      daylightCapSegments - result.finalSegments.daylight;

    savePlan(plan);
    info(
      `Out of capacity for today. Fast travel paused. Continue tomorrow with \`fast resume\`.`,
    );
  } else if (result.status === 'error_no_progress') {
    // A single leg can't fit even a fresh full day's daylight. The plan is kept
    // (with progress recorded) so `fast status` shows where it stalled; the GM
    // resolves it manually and clears the plan with `fast abort`.
    plan.legIndex = result.currentLegIndex;
    savePlan(plan);

    const fromHex =
      result.currentLegIndex === 0
        ? plan.startHex
        : plan.route[result.currentLegIndex - 1];
    const destHex = plan.route[result.currentLegIndex];
    const events = readEvents(file);
    const currentDate = lastCalendarDate(events);
    const capHours = currentDate
      ? segmentsToHours(getDaylightCapSegments(currentDate))
      : null;
    const capText = capHours !== null ? ` (${capHours}h daylight)` : '';
    error(
      `Fast travel stalled: the leg ${fromHex} → ${destHex} can't fit in a single day${capText}. Use \`fast abort\` to clear the plan.`,
    );
  }
}

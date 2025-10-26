import { info } from '@skyreach/cli-kit';
import { getDaylightCapSegments, segmentsToHours } from '@skyreach/core';

import { readEvents } from '../../../../services/event-log.service';
import {
  computeSessionHash,
  lastCalendarDate,
} from '../../../../services/projectors.service';
import { deletePlan, savePlan } from '../core/fast-travel-plan';
import { loadEncounterTable } from '../encounters';

import type { FastTravelResult } from '../core/fast-travel-runner';
import type { FastTravelPlan } from '../types/fast-travel';

export { loadEncounterTable };

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
      throw new Error('No calendar date found in events while handling fast-travel encounter pause.');
    }
    const daylightCapSegments = getDaylightCapSegments(currentDate);
    plan.daylightSegmentsLeft =
      daylightCapSegments - result.finalSegments.daylight;

    // Update hash
    plan.currentHash = computeSessionHash(events);

    savePlan(plan);
    info(
      `Encounter! Fast travel paused. Use \`fast resume\` to continue after resolving the encounter.`,
    );
  } else if (result.status === 'paused_no_capacity') {
    // Update plan with current progress
    plan.legIndex = result.currentLegIndex;
    plan.activeSegmentsToday = result.finalSegments.active;

    // Recalculate daylight left from current events
    const events = readEvents(file);
    const currentDate =lastCalendarDate(events);
    if (!currentDate) {
      throw new Error('No calendar date found in events while handling fast-travel no-capacity pause.');
    }
    const daylightCapSegments = getDaylightCapSegments(currentDate);
    plan.daylightSegmentsLeft =
      daylightCapSegments - result.finalSegments.daylight;

    // Update hash
    plan.currentHash = computeSessionHash(events);

    savePlan(plan);
    info(
      `Out of capacity for today. Fast travel paused. Continue tomorrow with \`fast resume\`.`,
    );
  }
}

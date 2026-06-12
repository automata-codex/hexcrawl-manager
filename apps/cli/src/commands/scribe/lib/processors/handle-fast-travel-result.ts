import { error, info } from '@achm/cli-kit';
import { getDaylightCapSegments, segmentsToHours } from '@achm/core';

import { readEvents } from '../../../../services/event-log.service';
import { lastCalendarDate } from '../../../../services/projectors.service';
import {
  deletePlan,
  expectedResumeHex,
  savePlan,
} from '../core/fast-travel-plan';
import { formatHexAlertLines, getHexAlerts } from '../hex-alerts';

import type { FastTravelResult } from '../core/fast-travel-runner';
import type { FastTravelPlan } from '../types/fast-travel';

/**
 * Record paused progress on the plan and save it: the leg index, segments
 * used, and the daylight envelope recomputed from the current date.
 */
function persistPausedProgress(
  file: string,
  plan: FastTravelPlan,
  result: FastTravelResult,
) {
  plan.legIndex = result.currentLegIndex;
  plan.activeSegmentsToday = result.finalSegments.active;

  const events = readEvents(file);
  const currentDate = lastCalendarDate(events);
  if (!currentDate) {
    throw new Error(
      'No calendar date found in events while handling a fast-travel pause.',
    );
  }
  const daylightCapSegments = getDaylightCapSegments(currentDate);
  plan.daylightSegmentsLeft =
    daylightCapSegments - result.finalSegments.daylight;

  savePlan(plan);
}

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
    // Surface unknown clues / pending GM updates at the destination
    for (const line of formatHexAlertLines(
      plan.destHex,
      getHexAlerts(plan.destHex),
    )) {
      info(line);
    }
  } else if (result.status === 'paused_encounter') {
    persistPausedProgress(file, plan, result);
    // The party pauses IN the hex it just entered — the encounter hex.
    info(
      `Encounter at ${expectedResumeHex(plan)}! Fast travel paused. Use \`fast resume\` to continue after resolving the encounter.`,
    );
  } else if (result.status === 'paused_hex_alert') {
    persistPausedProgress(file, plan, result);
    // The party pauses IN the hex it just entered — the flagged hex.
    const pausedHex = expectedResumeHex(plan);
    for (const line of formatHexAlertLines(
      pausedHex,
      getHexAlerts(pausedHex),
    )) {
      info(line);
    }
    info(
      `Fast travel paused at ${pausedHex}. Use \`fast resume\` to continue.`,
    );
  } else if (result.status === 'paused_no_capacity') {
    persistPausedProgress(file, plan, result);
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

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
import {
  formatKeyedEncounterLines,
  getEntryKeyedEncounters,
} from '../keyed-encounters';

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
 * Every interface line for the triggers that fired on a single hex: keyed
 * encounters, then a random encounter check, then arrival alerts (unknown clues
 * / live beats / roleplay books / GM updates). Several can fire on one hex — the
 * runner pauses once under a single status and logs a note for each — so the
 * display gathers them all here and shows every one, and the GM never misses a
 * trigger hidden behind another.
 *
 * Keyed encounters and alerts are re-derived from hex data; whether the random
 * encounter check fired is a die roll, so it is passed in from the run result.
 */
function formatHexTriggerLines(
  hexId: string,
  randomEncounterTriggered: boolean,
): string[] {
  const lines = [
    ...formatKeyedEncounterLines(hexId, getEntryKeyedEncounters(hexId)),
  ];
  if (randomEncounterTriggered) {
    lines.push(
      `🎲 Encounter check triggered at ${hexId} — roll on the region table.`,
    );
  }
  lines.push(...formatHexAlertLines(hexId, getHexAlerts(hexId)));
  return lines;
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
    // Surface every trigger on the destination hex (a keyed encounter or alert
    // on the final hex completes the journey rather than pausing, so the GM
    // needs to see it here). A random encounter would have paused instead of
    // completing, so it never fires on this path.
    for (const line of formatHexTriggerLines(
      plan.destHex,
      result.randomEncounterTriggered ?? false,
    )) {
      info(line);
    }
  } else if (
    result.status === 'paused_encounter' ||
    result.status === 'paused_keyed_encounter' ||
    result.status === 'paused_hex_alert'
  ) {
    persistPausedProgress(file, plan, result);
    // The party pauses IN the hex it just entered. Surface every trigger that
    // fired there — keyed encounter, random encounter, and arrival alerts — not
    // just the one the runner chose for the pause status.
    const pausedHex = expectedResumeHex(plan);
    info(`Fast travel paused at ${pausedHex}.`);
    for (const line of formatHexTriggerLines(
      pausedHex,
      result.randomEncounterTriggered ?? false,
    )) {
      info(line);
    }
    info('Resolve the above, then continue with `fast resume`.');
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

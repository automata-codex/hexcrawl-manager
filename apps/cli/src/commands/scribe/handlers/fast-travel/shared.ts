import { info } from '@skyreach/cli-kit';
import { getDaylightCapSegments, segmentsToHours } from '@skyreach/core';
import { readAndValidateYaml, resolveDataPath } from '@skyreach/data';
import { EncounterTableSchema } from '@skyreach/schemas';

import {
  readEvents,
} from '../../../../services/event-log.service';
import { computeSessionHash } from '../../../../services/projectors.service';
import {
  deletePlan,
  savePlan,
} from '../../lib/core/fast-travel-plan';
import { emitMove, emitNote, emitTimeLog } from '../../lib/helpers/emitters';

import type {
  FastTravelEvent,
  FastTravelResult,
} from '../../lib/core/fast-travel-runner';
import type { FastTravelPlan } from '../../lib/types/fast-travel';
import type { EncounterTableData } from '@skyreach/schemas';

/**
 * Load the default encounter table.
 */
export function loadEncounterTable(): EncounterTableData {
  const encounterTablePath = resolveDataPath('default-encounter-table.yaml');
  return readAndValidateYaml(encounterTablePath, EncounterTableSchema);
}

/**
 * Emit all events from a fast travel result to the event log.
 */
export function emitFastTravelEvents(file: string, events: FastTravelEvent[]) {
  for (const event of events) {
    switch (event.type) {
      case 'move':
        emitMove(
          file,
          event.payload.from,
          event.payload.to,
          event.payload.pace,
        );
        break;
      case 'time_log':
        emitTimeLog(
          file,
          event.payload.segments,
          event.payload.daylightSegments,
          event.payload.nightSegments,
          event.payload.phase,
        );
        break;
      case 'note':
        emitNote(file, event.payload.text, event.payload.scope);
        break;
    }
  }
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
  } else if (result.status === 'paused_encounter') {
    // Update plan with current progress
    plan.legIndex = result.currentLegIndex;
    plan.activeSegmentsToday = result.finalSegments.active;

    // Recalculate daylight left from current events
    const events = readEvents(file);
    const currentDate = require('../../../../services/projectors.service').lastCalendarDate(
      events,
    );
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
    const currentDate = require('../../../../services/projectors.service').lastCalendarDate(
      events,
    );
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

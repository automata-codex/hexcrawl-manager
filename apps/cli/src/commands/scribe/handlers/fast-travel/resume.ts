import { info, error } from '@skyreach/cli-kit';
import { getDaylightCapSegments, segmentsToHours } from '@skyreach/core';
import { REPO_PATHS, readAndValidateYaml } from '@skyreach/data';
import { EncounterTableSchema } from '@skyreach/schemas';
import path from 'path';

import { readEvents } from '../../../../services/event-log.service';
import {
  selectCurrentHex,
  selectSegmentsUsedToday,
  selectWeatherCommitted,
  selectCampaignDate,
  selectSeason,
  computeSessionHash,
} from '../../../../services/projectors.service';
import { loadPlan, deletePlan, savePlan } from '../../lib/core/fast-travel-plan';
import { runFastTravel } from '../../lib/core/fast-travel-runner';
import {
  emitMove,
  emitTimeLog,
  emitNote,
} from '../../lib/helpers/emitters';
import { requireSession } from '../../services/general';

import type { FastTravelState } from '../../lib/core/fast-travel-runner';
import type { Context } from '../../types';

export default function fastTravelResume(ctx: Context) {
  if (!requireSession(ctx)) {
    return;
  }

  // Load plan
  const plan = loadPlan(ctx.sessionId!);
  if (!plan) {
    error('No active fast travel plan to resume.');
    return;
  }

  // Check integrity
  const events = readEvents(ctx.file!);
  const currentHash = computeSessionHash(events);
  if (currentHash !== plan.currentHash) {
    error(
      'Fast travel plan is stale (session has changed since pause). Use `fast abort` to clear the plan.',
    );
    return;
  }

  // Load session state
  const currentHex = selectCurrentHex(events);
  const { daylightUsed, totalUsed } = selectSegmentsUsedToday(events);
  const weather = selectWeatherCommitted(events);
  const currentDate = selectCampaignDate(events);
  const currentSeason = selectSeason(currentDate);
  const daylightCapSegments = getDaylightCapSegments(currentDate);
  const daylightSegmentsLeft = daylightCapSegments - daylightUsed;

  // Load encounter table
  const encounterTablePath = path.join(
    REPO_PATHS.ENCOUNTER_TABLES(),
    'default-encounter-table.yaml',
  );
  const encounterTable = readAndValidateYaml(
    encounterTablePath,
    EncounterTableSchema,
  );

  // Build state for runner
  const state: FastTravelState = {
    currentHex,
    route: plan.route,
    currentLegIndex: plan.currentLegIndex,
    pace: plan.pace,
    activeSegmentsToday: totalUsed,
    daylightSegmentsToday: daylightUsed,
    nightSegmentsToday: 0,
    daylightSegmentsLeft,
    daylightCapSegments,
    weather,
    currentDate,
    currentSeason,
    encounterTable,
  };

  info(`Resuming fast travel to ${plan.destHex}...`);

  // Run fast travel
  const result = runFastTravel(state);

  // Emit events
  for (const event of result.events) {
    switch (event.type) {
      case 'move':
        emitMove(ctx.file!, event.from, event.to, event.pace);
        break;
      case 'time_log':
        emitTimeLog(
          ctx.file!,
          event.segments,
          event.daylightSegments,
          event.nightSegments,
          event.phase,
        );
        break;
      case 'note':
        emitNote(ctx.file!, event.text, event.scope);
        break;
    }
  }

  // Handle result
  if (result.status === 'completed') {
    deletePlan(ctx.sessionId!);
    info(`Fast travel complete! Arrived at ${plan.destHex}.`);
    info(
      `Total time today: ${segmentsToHours(result.finalSegments.active)}h active, ${segmentsToHours(result.finalSegments.daylight)}h daylight`,
    );
  } else if (result.status === 'paused_encounter') {
    // Update plan with current progress
    plan.currentLegIndex = result.currentLegIndex;
    plan.activeSegmentsToday = result.finalSegments.active;
    plan.daylightSegmentsLeft =
      daylightCapSegments - result.finalSegments.daylight;

    // Update hash
    const updatedEvents = readEvents(ctx.file!);
    plan.currentHash = computeSessionHash(updatedEvents);

    savePlan(plan);
    info(
      `Encounter! Fast travel paused. Use \`fast resume\` to continue after resolving the encounter.`,
    );
  } else if (result.status === 'paused_no_capacity') {
    // Update plan with current progress
    plan.currentLegIndex = result.currentLegIndex;
    plan.activeSegmentsToday = result.finalSegments.active;
    plan.daylightSegmentsLeft =
      daylightCapSegments - result.finalSegments.daylight;

    // Update hash
    const updatedEvents = readEvents(ctx.file!);
    plan.currentHash = computeSessionHash(updatedEvents);

    savePlan(plan);
    info(
      `Out of capacity for today. Fast travel paused. Continue tomorrow with \`fast resume\`.`,
    );
  }
}

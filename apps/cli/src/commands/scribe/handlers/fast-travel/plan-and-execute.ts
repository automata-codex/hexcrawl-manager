import { info, error } from '@skyreach/cli-kit';
import { getDaylightCapSegments, segmentsToHours } from '@skyreach/core';
import { REPO_PATHS, readAndValidateYaml } from '@skyreach/data';
import {
  EncounterTableSchema,
  TrailMapSchema,
  type Pace,
} from '@skyreach/schemas';
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
import {
  createPlan,
  loadPlan,
  savePlan,
  deletePlan,
} from '../../lib/core/fast-travel-plan';
import { runFastTravel } from '../../lib/core/fast-travel-runner';
import {
  emitMove,
  emitTimeLog,
  emitNote,
} from '../../lib/helpers/emitters';
import { buildTrailGraph, bfsTrailPath } from '../../lib/helpers/trails';
import { requireSession } from '../../services/general';

import type { FastTravelState } from '../../lib/core/fast-travel-runner';
import type { Context } from '../../types';

export default function fastTravelPlanAndExecute(
  ctx: Context,
  dest: string,
  pace: Pace,
) {
  if (!requireSession(ctx)) {
    return;
  }

  // Check if there's already a plan
  const existingPlan = loadPlan(ctx.sessionId!);
  if (existingPlan) {
    error(
      'A fast travel plan is already active. Use `fast status` to view it, `fast resume` to continue, or `fast abort` to cancel it.',
    );
    return;
  }

  // Load trails
  const trailsPath = path.join(REPO_PATHS.TRAILS(), 'trails.yaml');
  const trails = readAndValidateYaml(trailsPath, TrailMapSchema);

  // Load current session state
  const events = readEvents(ctx.file!);
  const currentHex = selectCurrentHex(events);
  if (!currentHex) {
    error('Cannot fast travel: no current location. Use `move` first.');
    return;
  }

  // Build trail graph and find path
  const graph = buildTrailGraph(trails);
  const route = bfsTrailPath(graph, trails, currentHex, dest);

  if (!route) {
    error(`No trail route found from ${currentHex} to ${dest}.`);
    return;
  }

  info(`Found route: ${currentHex} → ${route.join(' → ')}`);

  // Load session state for planning
  const { daylightUsed, totalUsed } = selectSegmentsUsedToday(events);
  const weather = selectWeatherCommitted(events);
  const currentDate = selectCampaignDate(events);
  const currentSeason = selectSeason(currentDate);
  const daylightCapSegments = getDaylightCapSegments(currentDate);
  const daylightSegmentsLeft = daylightCapSegments - daylightUsed;
  const currentHash = computeSessionHash(events);
  const currentSeq = events.length;

  // Check if weather is committed for today
  const hasWeatherForToday = weather !== null;

  // Create plan
  const plan = createPlan({
    sessionId: ctx.sessionId!,
    startHex: currentHex,
    destHex: dest,
    pace,
    route,
    activeSegmentsToday: totalUsed,
    daylightSegmentsLeft,
    hasWeatherForToday,
    currentSeq,
    currentHash,
  });

  savePlan(plan);
  info(`Fast travel plan created. Starting journey...`);

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
    route,
    currentLegIndex: 0,
    pace,
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
    info(`Fast travel complete! Arrived at ${dest}.`);
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

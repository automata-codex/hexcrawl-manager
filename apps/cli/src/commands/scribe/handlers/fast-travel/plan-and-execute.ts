import { error, info } from '@skyreach/cli-kit';
import { getDaylightCapSegments, getSeasonForDate } from '@skyreach/core';
import { REPO_PATHS, readAndValidateYaml } from '@skyreach/data';
import { TrailMapSchema, type Pace } from '@skyreach/schemas';
import path from 'path';

import { readEvents } from '../../../../services/event-log.service';
import {
  computeSessionHash,
  lastCalendarDate,
  selectCurrentHex,
  selectCurrentWeather,
  selectSegmentsUsedToday,
} from '../../../../services/projectors.service';
import { createPlan, loadPlan, savePlan } from '../../lib/core/fast-travel-plan';
import { runFastTravel } from '../../lib/core/fast-travel-runner';
import { loadEncounterTable } from '../../lib/encounters';
import { buildTrailGraph, bfsTrailPath } from '../../lib/helpers/trails';
import { requireSession } from '../../services/general';

import {
  emitFastTravelEvents,
  handleFastTravelResult,
} from './shared';

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
  const segmentsUsedToday = selectSegmentsUsedToday(events);
  if (!segmentsUsedToday) {
    error(
      'Cannot fast travel: no open day found. Use `day start` to begin a new day.',
    );
    return;
  }
  const { daylightSegments: daylightUsed, activeSegments: totalUsed } =
    segmentsUsedToday;
  const weather = selectCurrentWeather(events);
  const currentDate = lastCalendarDate(events);
  if (!currentDate) {
    error(
      'Cannot fast travel: no current date. Use `day start` or `date set` first.',
    );
    return;
  }

  const currentSeason = getSeasonForDate(currentDate);
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
  const encounterTable = loadEncounterTable();

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

  // Emit events and handle result
  emitFastTravelEvents(ctx.file!, result.events);
  handleFastTravelResult(ctx.file!, ctx.sessionId!, plan, result);
}

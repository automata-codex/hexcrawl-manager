import { error, info } from '@achm/cli-kit';
import { getDaylightCapSegments, getSeasonForDate } from '@achm/core';
import { loadMapConfig, REPO_PATHS, readAndValidateYaml } from '@achm/data';
import { TrailMapSchema, type Pace } from '@achm/schemas';

import { readEvents } from '../../../../services/event-log.service';
import {
  lastCalendarDate,
  selectCurrentHex,
  selectCurrentWeather,
  selectSegmentsUsedToday,
} from '../../../../services/projectors.service';
import { driveJourney } from '../../lib/core/drive-journey';
import {
  createPlan,
  loadPlan,
  savePlan,
} from '../../lib/core/fast-travel-plan';
import { resolveEncounterChance } from '../../lib/encounters';
import { getHexAlerts } from '../../lib/hex-alerts';
import { handleFastTravelResult } from '../../lib/processors';
import { buildTrailGraph, bfsTrailPath } from '../../lib/trails';
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

  // Load trails and notation
  const trails = readAndValidateYaml(REPO_PATHS.TRAILS(), TrailMapSchema);
  const notation = loadMapConfig().grid.notation;

  // Load current session state
  const events = readEvents(ctx.file!);
  const currentHex = selectCurrentHex(events);
  if (!currentHex) {
    error('Cannot fast travel: no current location. Use `move` first.');
    return;
  }

  // Build trail graph and find path
  const graph = buildTrailGraph(trails, notation);
  const route = bfsTrailPath(graph, trails, currentHex, dest, notation);

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

  // Create plan
  const plan = createPlan({
    sessionId: ctx.sessionId!,
    startHex: currentHex,
    destHex: dest,
    pace,
    route,
    activeSegmentsToday: totalUsed,
    daylightSegmentsLeft,
  });

  savePlan(plan);
  info(`Fast travel plan created. Starting journey...`);

  // Resolve per-hex encounter chances and arrival alerts for the route
  const encounterChances = Object.fromEntries(
    route.map((hex) => [hex, resolveEncounterChance(hex)]),
  );
  const hexAlerts = Object.fromEntries(
    route.map((hex) => [hex, getHexAlerts(hex)]),
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
    encounterChances,
    hexAlerts,
  };

  // Drive the journey to completion, auto-advancing days as needed.
  const result = driveJourney(ctx, ctx.file!, state);
  handleFastTravelResult(ctx.file!, ctx.sessionId!, plan, result);
}

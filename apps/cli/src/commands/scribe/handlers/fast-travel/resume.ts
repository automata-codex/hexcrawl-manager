import { error, info } from '@achm/cli-kit';
import { getDaylightCapSegments, getSeasonForDate } from '@achm/core';

import { readEvents } from '../../../../services/event-log.service';
import {
  computeSessionHash,
  lastCalendarDate,
  selectCurrentHex,
  selectCurrentWeather,
  selectSegmentsUsedToday,
} from '../../../../services/projectors.service';
import { driveJourney } from '../../lib/core/drive-journey';
import { loadPlan } from '../../lib/core/fast-travel-plan';
import {
  loadEncounterTable,
  resolveEncounterChance,
} from '../../lib/encounters';
import { handleFastTravelResult } from '../../lib/processors';
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

  // Load encounter table and per-hex encounter chances for the route
  const encounterTable = loadEncounterTable();
  const encounterChances = Object.fromEntries(
    plan.route.map((hex) => [hex, resolveEncounterChance(hex)]),
  );

  // Build state for runner
  const state: FastTravelState = {
    currentHex,
    route: plan.route,
    currentLegIndex: plan.legIndex,
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
    encounterChances,
  };

  info(`Resuming fast travel to ${plan.destHex}...`);

  // Drive the journey to completion, auto-advancing days as needed.
  const result = driveJourney(ctx, ctx.file!, state);
  handleFastTravelResult(ctx.file!, ctx.sessionId!, plan, result);
}

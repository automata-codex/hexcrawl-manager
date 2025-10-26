import { error, info } from '@skyreach/cli-kit';
import { getDaylightCapSegments, getSeasonForDate } from '@skyreach/core';

import { readEvents } from '../../../../services/event-log.service';
import {
  computeSessionHash,
  lastCalendarDate,
  selectCurrentHex,
  selectCurrentWeather,
  selectSegmentsUsedToday,
} from '../../../../services/projectors.service';
import { loadPlan } from '../../lib/core/fast-travel-plan';
import { runFastTravel } from '../../lib/core/fast-travel-runner';
import { requireSession } from '../../services/general';

import {
  emitFastTravelEvents,
  handleFastTravelResult,
  loadEncounterTable,
} from './shared';

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

  // Load encounter table
  const encounterTable = loadEncounterTable();

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
  };

  info(`Resuming fast travel to ${plan.destHex}...`);

  // Run fast travel
  const result = runFastTravel(state);

  // Emit events and handle result
  emitFastTravelEvents(ctx.file!, result.events);
  handleFastTravelResult(ctx.file!, ctx.sessionId!, plan, result);
}

import { error, info } from '@achm/cli-kit';
import { getDaylightCapSegments, getSeasonForDate } from '@achm/core';
import { loadMapConfig } from '@achm/data';

import { readEvents } from '../../../../services/event-log.service';
import {
  lastCalendarDate,
  selectCurrentHex,
  selectCurrentWeather,
  selectSegmentsUsedToday,
} from '../../../../services/projectors.service';
import { driveJourney } from '../../lib/core/drive-journey';
import {
  expectedResumeHex,
  loadPlan,
  verifyPlanPosition,
} from '../../lib/core/fast-travel-plan';
import { resolveEncounterChance } from '../../lib/encounters';
import { getHexAlerts } from '../../lib/hex-alerts';
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

  // Check the party is where the plan expects. Tolerant of other log changes
  // (encounter resolution, notes, day boundaries) — only position must match.
  const events = readEvents(ctx.file!);
  const currentHex = selectCurrentHex(events);
  const notation = loadMapConfig().grid.notation;
  if (!verifyPlanPosition(plan, currentHex, notation)) {
    error(
      `Party has moved since the pause (at ${currentHex ?? 'unknown'}, expected ${expectedResumeHex(plan)}); the plan no longer lines up. Use \`fast abort\` to clear it.`,
    );
    return;
  }

  // Load session state
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

  // Resolve per-hex encounter chances and arrival alerts for the route
  const encounterChances = Object.fromEntries(
    plan.route.map((hex) => [hex, resolveEncounterChance(hex)]),
  );
  const hexAlerts = Object.fromEntries(
    plan.route.map((hex) => [hex, getHexAlerts(hex)]),
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
    encounterChances,
    hexAlerts,
  };

  info(`Resuming fast travel to ${plan.destHex}...`);

  // Drive the journey to completion, auto-advancing days as needed.
  const result = driveJourney(ctx, ctx.file!, state);
  handleFastTravelResult(ctx.file!, ctx.sessionId!, plan, result);
}

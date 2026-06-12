import { info } from '@achm/cli-kit';
import {
  datesEqual,
  getDaylightCapSegments,
  getSeasonForDate,
} from '@achm/core';

import { readEvents } from '../../../../services/event-log.service';
import { selectCurrentForecast } from '../../../../services/projectors.service';
import {
  emitDayEnd,
  emitDayStart,
  emitFastTravelEvents,
  emitWeatherCommitted,
} from '../emitters';
import { rollWeatherForDate } from '../weather';

import { runFastTravel } from './fast-travel-runner';

import type { FastTravelResult, FastTravelState } from './fast-travel-runner';
import type { Context } from '../../types';
import type { Season, WeatherCategory, WeatherCommitted } from '@achm/core';
import type { CampaignDate, ScribeEvent } from '@achm/schemas';

/**
 * Drive a fast-travel journey to completion across day boundaries.
 *
 * `runFastTravel` is a pure, single-day function: it walks legs until it
 * completes the route, hits an encounter, or runs out of capacity for the day.
 * This orchestrator wraps it in a loop that owns the calendar and day-boundary
 * I/O: when a day fills up it ends the day, starts the next one (recomputing the
 * daylight envelope from the new date), auto-commits that day's weather, and
 * resumes the route from where it left off.
 *
 * Terminal results returned to the caller:
 *  - `completed`          — reached the destination.
 *  - `paused_encounter`   — stopped at a hex for the GM to resolve an encounter.
 *  - `error_no_progress`  — a single leg can't fit even a fresh full day's
 *                           daylight (guards against an infinite advance loop).
 */
export function driveJourney(
  ctx: Context,
  file: string,
  state: FastTravelState,
): FastTravelResult {
  // Day 1: ensure weather is committed for the current date. The GM may have
  // committed it already (interactive play); if not, auto-roll it now so the
  // first day's legs see any weather doubler, consistent with advanced days.
  let weather = committedWeatherForDate(readEvents(file), state.currentDate);
  if (!weather) {
    weather = autoCommitWeather(file, state.currentDate);
  }
  state = { ...state, weather };

  while (true) {
    const result = runFastTravel(state);
    emitFastTravelEvents(file, result.events);

    // Anything other than a daily capacity pause is terminal for the journey.
    if (result.status !== 'paused_no_capacity') {
      return result;
    }

    // Zero progress means the next leg won't fit the day's remaining daylight.
    // If the day was already fresh (nothing used yet), advancing to another day
    // can't help — stop instead of looping forever. If the day was only
    // partially used, fall through and advance so the leg gets a fresh day.
    const dayWasFresh =
      state.daylightSegmentsLeft === state.daylightCapSegments &&
      state.activeSegmentsToday === 0;
    if (result.events.length === 0 && dayWasFresh) {
      return { ...result, status: 'error_no_progress' };
    }

    // End the current day with its real totals.
    emitDayEnd(
      file,
      result.finalSegments.active,
      result.finalSegments.daylight,
      result.finalSegments.night,
    );

    // Start the next day and recompute the daylight envelope FROM THE NEW DATE.
    const nextDate = ctx.calendar.incrementDate(state.currentDate, 1);
    const nextSeason = getSeasonForDate(nextDate);
    const nextDaylightCap = getDaylightCapSegments(nextDate);
    emitDayStart(file, nextDate, nextSeason, nextDaylightCap);

    // Auto-roll + commit weather for the new day (take the roll as-is).
    const nextWeather = autoCommitWeather(file, nextDate);
    info(
      `Day rolled over → ${ctx.calendar.formatDate(nextDate)} (${nextSeason}), weather: ${nextWeather.category}`,
    );

    // The party is parked at the last hex it actually entered: the leg before
    // the one that didn't fit, or the journey's start hex if no leg has run yet
    // (a first leg that won't fit a partially-used opening day).
    const parkedHex =
      result.currentLegIndex === 0
        ? state.currentHex
        : state.route[result.currentLegIndex - 1];
    state = {
      ...state,
      currentHex: parkedHex,
      currentLegIndex: result.currentLegIndex,
      activeSegmentsToday: 0,
      daylightSegmentsToday: 0,
      nightSegmentsToday: 0,
      daylightSegmentsLeft: nextDaylightCap,
      daylightCapSegments: nextDaylightCap,
      weather: nextWeather,
      currentDate: nextDate,
      currentSeason: nextSeason,
    };
  }
}

/**
 * Roll and commit weather for a date, returning the in-memory committed value
 * so the journey can apply its travel doubler. Forecast chains off the prior
 * day's `forecastAfter` via `selectCurrentForecast`.
 */
function autoCommitWeather(file: string, date: CampaignDate): WeatherCommitted {
  const forecastBefore = selectCurrentForecast(readEvents(file));
  const payload = rollWeatherForDate(date, forecastBefore);
  emitWeatherCommitted(file, payload);
  return {
    ...payload,
    season: payload.season as Season,
    category: payload.category as WeatherCategory,
    detail: payload.detail ?? undefined,
  };
}

/** Most recent weather committed *for the given date*, or null if none. */
function committedWeatherForDate(
  events: ScribeEvent[],
  date: CampaignDate,
): WeatherCommitted | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (
      e.kind === 'weather_committed' &&
      e.payload &&
      datesEqual((e.payload as WeatherCommitted).date, date)
    ) {
      return e.payload as WeatherCommitted;
    }
  }
  return null;
}

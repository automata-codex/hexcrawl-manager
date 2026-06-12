import { normalizeHexId } from '@achm/core';
import { REPO_PATHS, readAndValidateYaml, writeYamlAtomic } from '@achm/data';
import { randomUUID } from 'node:crypto';
import { existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import type { FastTravelPlan } from '../types/fast-travel';
import type { CoordinateNotation } from '@achm/core';
import type { Pace } from '@achm/schemas';

// Zod schema for validating loaded plans
const FastTravelPlanSchema = z.object({
  groupId: z.string(),
  sessionId: z.string(),
  startHex: z.string(),
  destHex: z.string(),
  pace: z.enum(['slow', 'normal', 'fast']),
  route: z.array(z.string()),
  legIndex: z.number().int().min(0),
  activeSegmentsToday: z.number().int().min(0),
  daylightSegmentsLeft: z.number().int().min(0),
});

export interface CreatePlanArgs {
  sessionId: string;
  startHex: string;
  destHex: string;
  pace: Pace;
  route: string[];
  activeSegmentsToday: number; // Segments already used today before fast travel starts
  daylightSegmentsLeft: number; // Remaining daylight segments available
}

/**
 * Create a new fast travel plan.
 */
export function createPlan(args: CreatePlanArgs): FastTravelPlan {
  return {
    groupId: randomUUID(),
    sessionId: args.sessionId,
    startHex: args.startHex,
    destHex: args.destHex,
    pace: args.pace,
    route: args.route,
    legIndex: 0, // Start at the beginning
    activeSegmentsToday: args.activeSegmentsToday,
    daylightSegmentsLeft: args.daylightSegmentsLeft,
  };
}

/**
 * Save a fast travel plan to disk.
 */
export function savePlan(plan: FastTravelPlan): void {
  const planFile = path.join(
    REPO_PATHS.FAST_TRAVEL(),
    `${plan.sessionId}.yaml`,
  );
  writeYamlAtomic(planFile, plan);
}

/**
 * Load a fast travel plan from disk.
 * Returns null if no plan exists for the session.
 */
export function loadPlan(sessionId: string): FastTravelPlan | null {
  const planFile = path.join(REPO_PATHS.FAST_TRAVEL(), `${sessionId}.yaml`);

  if (!existsSync(planFile)) {
    return null;
  }

  try {
    const plan = readAndValidateYaml(planFile, FastTravelPlanSchema);
    return plan as FastTravelPlan;
  } catch {
    return null;
  }
}

/**
 * Delete a fast travel plan from disk.
 */
export function deletePlan(sessionId: string): void {
  const planFile = path.join(REPO_PATHS.FAST_TRAVEL(), `${sessionId}.yaml`);

  if (existsSync(planFile)) {
    unlinkSync(planFile);
  }
}

/**
 * The hex the party should be parked at when resuming a paused plan: the last
 * route hex it entered (`legIndex` is the next leg to execute, so an encounter
 * pause parks the party IN the encounter hex, `route[legIndex - 1]`), or the
 * journey's start hex when no leg has run yet.
 */
export function expectedResumeHex(plan: FastTravelPlan): string {
  return plan.legIndex === 0 ? plan.startHex : plan.route[plan.legIndex - 1];
}

/**
 * Verify the party is where the plan expects before resuming. Tolerant of
 * other log changes (resolving an encounter, notes, day boundaries) — only the
 * party's position has to line up.
 */
export function verifyPlanPosition(
  plan: FastTravelPlan,
  currentHex: string | null,
  notation: CoordinateNotation,
): boolean {
  if (!currentHex) {
    return false;
  }
  try {
    return (
      normalizeHexId(currentHex, notation) ===
      normalizeHexId(expectedResumeHex(plan), notation)
    );
  } catch {
    // Unparseable hex ID (e.g. a malformed manual `move`) — fail closed.
    return false;
  }
}

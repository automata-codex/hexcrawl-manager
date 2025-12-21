import {
  REPO_PATHS,
  readAndValidateYaml,
  writeYamlAtomic,
} from '@achm/data';
import { randomUUID } from 'node:crypto';
import { existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import type { FastTravelPlan } from '../types/fast-travel';
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
  hasWeatherForToday: z.boolean(),
  lastSeq: z.number().int(),
  lastHash: z.string(),
});

export interface CreatePlanArgs {
  sessionId: string;
  startHex: string;
  destHex: string;
  pace: Pace;
  route: string[];
  activeSegmentsToday: number; // Segments already used today before fast travel starts
  daylightSegmentsLeft: number; // Remaining daylight segments available
  hasWeatherForToday: boolean; // Whether weather has been committed for today
  currentSeq: number;
  currentHash: string;
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
    hasWeatherForToday: args.hasWeatherForToday,
    lastSeq: args.currentSeq,
    lastHash: args.currentHash,
    currentHash: args.currentHash,
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
 * Verify that the plan's integrity markers match the current log state.
 * This prevents resuming a stale plan after manual log edits.
 */
export function verifyPlanIntegrity(
  plan: FastTravelPlan,
  currentLogSeq: number,
  currentLogHash: string,
): boolean {
  return plan.lastSeq === currentLogSeq && plan.lastHash === currentLogHash;
}

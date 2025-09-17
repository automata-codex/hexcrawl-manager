import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import yaml from 'yaml';
import { hexSort, normalizeHexId } from '../../../../lib/hexes';
import { getRepoPath } from '../../../../lib/repo';
import { info, error } from '../../scribe/lib/report';
import { compareSeasonIds, normalizeSeasonId } from './season.ts';
import { rollDice } from '../../scribe/lib/math.ts';

const SESSION_LOGS_DIR = getRepoPath('data', 'session-logs');
const SESSIONS_DIR = path.join(SESSION_LOGS_DIR, 'sessions');
const ROLLOVERS_DIR = path.join(SESSION_LOGS_DIR, 'rollovers');

export function appendToMetaAppliedSessions(meta: any, fileId: string) {
  if (!meta.appliedSessions) {
    meta.appliedSessions = [];
  }
  if (!meta.appliedSessions.includes(fileId)) {
    meta.appliedSessions.push(fileId);
  }
}

/**
 * Applies the rollover logic to trails, mutating the trails object and returning the effects.
 * If dryRun=true, no mutation or real dice rolls (simulate both outcomes for plan).
 *
 * @param trails The trails object (edgeKey -> data)
 * @param havens Array of haven hexes
 * @param dryRun If true, simulate both outcomes for unused far edges
 * @returns Effects object for footprint
 */
export function applyRolloverToTrails(trails: Record<string, any>, havens: string[], dryRun = false) {
  const maintained: string[] = [];
  const persisted: string[] = [];
  const deletedTrails: string[] = [];
  const farChecks: Record<string, any> = {};
  // Classify and process each non-permanent edge
  for (const [edge, data] of Object.entries(trails)) {
    if (data.permanent) continue;
    const [a, b] = edge.split('-');
    const isNear = isHexNearAnyHaven(a, havens) || isHexNearAnyHaven(b, havens);
    if (isNear) {
      // Near: increment streak, possibly set permanent
      data.streak = Math.min(3, (data.streak || 0) + 1);
      if (data.streak === 3) data.permanent = true;
      maintained.push(edge);
    } else {
      // Far
      if (data.usedThisSeason) {
        // Persist, increment streak
        data.streak = Math.min(3, (data.streak || 0) + 1);
        persisted.push(edge);
        farChecks[edge] = { outcome: `persist-streak=${data.streak}` };
      } else {
        if (dryRun) {
          // For plan: show both possible outcomes
          deletedTrails.push(`${edge} (if d6=1-3)`);
          persisted.push(`${edge} (if d6=4-6)`);
          farChecks[edge] = { d6: '1-3/4-6', outcome: 'deleted/persist-streak=0' };
        } else {
          // Real roll
          const d6 = rollDice('1d6');
          if (d6 <= 3) {
            // Delete
            deletedTrails.push(edge);
            farChecks[edge] = { d6, outcome: 'deleted' };
            delete trails[edge];
            continue;
          } else {
            // Persist, reset streak
            data.streak = 0;
            persisted.push(edge);
            farChecks[edge] = { d6, outcome: 'persist-streak=0' };
          }
        }
      }
    }
  }
  // Reset usedThisSeason on all remaining edges
  for (const data of Object.values(trails)) {
    if (data.usedThisSeason) data.usedThisSeason = false;
  }
  return { maintained, persisted, deletedTrails, farChecks };
}

export function canonicalEdgeKey(a: string, b: string): string {
  const [h1, h2] = [normalizeHexId(a), normalizeHexId(b)].sort(hexSort);
  return `${h1.toLowerCase()}-${h2.toLowerCase()}`;
}

/**
 * Find the most recent rollover footprint for a given seasonId (<= that season).
 * Returns the parsed YAML data or null if not found.
 */
export function getMostRecentRolloverFootprint(seasonId: string): any | null {
  const footprintsDir = getRepoPath('data', 'session-logs', 'footprints');
  let files: string[] = [];
  try {
    files = fs.readdirSync(footprintsDir)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map(f => path.join(footprintsDir, f));
  } catch {
    return null;
  }
  let best: { seasonId: string, file: string, data: any } | null = null;
  for (const file of files) {
    const data = yaml.parse(fs.readFileSync(file, 'utf8'));
    if (data.kind === 'rollover' && data.seasonId) {
      if (!best || compareSeasonIds(data.seasonId, best.seasonId) > 0 && compareSeasonIds(data.seasonId, seasonId) <= 0) {
        best = { seasonId: data.seasonId, file, data };
      }
    }
  }
  return best ? best.data : null;
}

export function getNextUnrolledSeason(meta: any): string | null {
  // meta.rolledSeasons is sorted chronologically; find the next season after the last rolled
  if (!meta.rolledSeasons || meta.rolledSeasons.length === 0) return null;
  const last = meta.rolledSeasons[meta.rolledSeasons.length - 1];
  // Next season: increment season (wrap to next year if autumn)
  const [yearStr, season] = normalizeSeasonId(last).split('-');
  const year = parseInt(yearStr, 10);
  const order = ['winter', 'spring', 'summer', 'autumn'];
  let idx = order.indexOf(season);
  if (idx === -1) return null;
  idx = (idx + 1) % 4;
  const nextYear = idx === 0 ? year + 1 : year;
  return `${nextYear}-${order[idx]}`;
}

export function hexDistance(a: string, b: string): number {
  const ac = hexToCube(a);
  const bc = hexToCube(b);
  return Math.max(Math.abs(ac.x - bc.x), Math.abs(ac.y - bc.y), Math.abs(ac.z - bc.z));
}

export function hexToCube(hex: string): { x: number, y: number, z: number } {
  // Flat-top odd-q offset to cube
  // Columns: letters A-Z, Rows: 1-27
  const col = hex[0].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
  const row = parseInt(hex.slice(1), 10) - 1;
  const x = col;
  const z = row - ((col - (col & 1)) >> 1);
  const y = -x - z;
  return { x, y, z };
}

export function isGitDirty(): boolean {
  try {
    const output = execSync('git status --porcelain', { encoding: 'utf8' });
    return output.trim().length > 0;
  } catch (e) {
    // If git is not available, treat as dirty to be safe
    return true;
  }
}

export function isHexNearAnyHaven(hex: string, havens: string[], maxDist = 3): boolean {
  return havens.some(haven => hexDistance(hex, haven) <= maxDist);
}

export function isRolloverAlreadyApplied(meta: any, fileId: string): boolean {
  return meta.appliedSessions?.includes(fileId);
}

export function isRolloverChronologyValid(meta: any, seasonId: string): { valid: boolean, expected: string } {
  // Only allow rollover for the next unapplied season
  const expected = getNextUnrolledSeason(meta);
  const valid = expected && normalizeSeasonId(seasonId) === normalizeSeasonId(expected);
  return { valid: !!valid, expected: expected || '' };
}

export function isRolloverFile(filePath: string): boolean {
  const path = require('path');
  const dir = path.basename(path.dirname(filePath));
  const base = path.basename(filePath);
  return dir === 'rollovers' && /^rollover_[\w-]+_\d{4}-\d{2}-\d{2}.*\.jsonl$/i.test(base);
}

export function isSessionAlreadyApplied(meta: any, fileId: string): boolean {
  return meta.appliedSessions?.includes(fileId);
}

export function isSessionChronologyValid(meta: any, seasonId: string): { valid: boolean, missing: string[] } {
  // All seasons up to and including this one must be in meta.rolledSeasons
  // For now, just check that this seasonId is in meta.rolledSeasons
  const normalized = normalizeSeasonId(seasonId);
  const rolled = (meta.rolledSeasons || []).map(normalizeSeasonId);
  const valid = rolled.includes(normalized);
  return { valid, missing: valid ? [] : [seasonId] };
}

export function isSessionFile(filePath: string): boolean {
  const path = require('path');
  const dir = path.basename(path.dirname(filePath));
  const base = path.basename(filePath);
  return dir === 'sessions' && /^session_\d+_\d{4}-\d{2}-\d{2}.*\.jsonl$/i.test(base);
}

export function listCandidateFiles(meta: any): string[] {
  const sessionFiles = listFilesIfDir(SESSIONS_DIR).filter(f => f.endsWith('.jsonl'));
  const rolloverFiles = listFilesIfDir(ROLLOVERS_DIR).filter(f => f.endsWith('.jsonl'));
  const allCandidates = [...sessionFiles, ...rolloverFiles].filter(f => {
    const id = path.basename(f);
    return !meta.appliedSessions?.includes(id);
  });
  // Sort by filename (chronological order assumed)
  allCandidates.sort((a, b) => a.localeCompare(b));
  return allCandidates;
}

function listFilesIfDir(dir: string): string[] {
  try {
    return fs.readdirSync(dir).map(f => path.join(dir, f));
  } catch {
    return [];
  }
}

export async function promptSelectFile(candidates: string[]): Promise<string> {
  const choices = candidates.map(f => ({
    title: path.relative(process.cwd(), f),
    value: f
  }));
  const response = await prompts({
    type: 'select',
    name: 'file',
    message: 'Select a session or rollover file:',
    choices
  });
  return response.file;
}

export function requireCleanGitOrAllowDirty(opts?: { allowDirty?: boolean }) {
  const allowDirty = opts?.allowDirty || process.argv.includes('--allow-dirty');
  if (!allowDirty && isGitDirty()) {
    error('Refusing to proceed: working tree is dirty (commit or stash changes, or use --allow-dirty).');
    process.exit(2);
  }
}

export async function resolveInputFile(fileArg: string | undefined, meta: any, opts?: { noPrompt?: boolean }): Promise<string> {
  const noPrompt = opts?.noPrompt || process.argv.includes('--no-prompt');
  if (fileArg) return fileArg;
  const candidates = listCandidateFiles(meta);
  if (candidates.length === 0) {
    info('No unapplied session or rollover files found.');
    process.exit(5);
  }
  if (noPrompt) {
    error('No file specified and --no-prompt is set.');
    process.exit(4);
  }
  const selected = await promptSelectFile(candidates);
  if (!selected) {
    info('No file selected.');
    process.exit(5);
  }
  info(`Selected file: ${selected}`);
  return selected;
}

/**
 * Applies a session to trails, mutating the trails object and returning the effects.
 * If dryRun=true, does not mutate trails, just simulates the effects.
 *
 * @param events Array of session events
 * @param trails The trails object (edgeKey -> data)
 * @param seasonId The session's seasonId
 * @param deletedTrails Array of deleted edge keys from the most recent rollover
 * @param dryRun If true, do not mutate trails, just simulate
 * @returns { effects, before, after }
 */
export function applySessionToTrails(
  events: any[],
  trails: Record<string, any>,
  seasonId: string,
  deletedTrails: string[],
  dryRun = false,
) {
  const created: string[] = [];
  const usedFlags: Record<string, boolean> = {};
  const rediscovered: string[] = [];
  let currentHex: string | null = null;
  let currentSeason = seasonId;
  const before: Record<string, any> = {};
  const after: Record<string, any> = {};
  // Find session_start
  const sessionStart = events.find(e => e.kind === 'session_start');
  if (sessionStart && sessionStart.payload && sessionStart.payload.startHex) {
    currentHex = sessionStart.payload.startHex as string;
  }
  // Build a set of all affected edges
  const affected = new Set<string>();
  for (const e of events) {
    if (e.kind === 'day_start') {
      if (e.payload && e.payload.calendarDate && e.payload.season) {
        currentSeason = e.payload.seasonId || seasonId;
      }
    }
    if (e.kind === 'trail' && e.payload && e.payload.marked) {
      const edge = canonicalEdgeKey(e.payload.from as string, e.payload.to as string);
      affected.add(edge);
      if (!dryRun && !trails[edge]) {
        trails[edge] = { permanent: false, streak: 0 };
      }
      if (!trails[edge] && dryRun) {
        // Simulate creation
        created.push(edge);
        usedFlags[edge] = true;
        after[edge] = { permanent: false, streak: 0, usedThisSeason: true, lastSeasonTouched: currentSeason };
        continue;
      }
      if (!dryRun && !trails[edge]) {
        created.push(edge);
      }
      if (!dryRun) {
        trails[edge].usedThisSeason = true;
        trails[edge].lastSeasonTouched = currentSeason;
      }
      usedFlags[edge] = true;
      before[edge] = before[edge] || (trails[edge] ? { ...trails[edge] } : undefined);
      after[edge] = { ...(trails[edge] || { permanent: false, streak: 0 }), usedThisSeason: true, lastSeasonTouched: currentSeason };
    }
    if (e.kind === 'move') {
      let from = e.payload.from as string | null;
      let to = e.payload.to as string;
      if (!from && currentHex) from = currentHex;
      if (!from || !to) continue;
      const edge = canonicalEdgeKey(from, to);
      currentHex = to;
      affected.add(edge);
      if (trails[edge]) {
        if (!dryRun) {
          trails[edge].usedThisSeason = true;
          trails[edge].lastSeasonTouched = currentSeason;
        }
        usedFlags[edge] = true;
        before[edge] = before[edge] || (trails[edge] ? { ...trails[edge] } : undefined);
        after[edge] = { ...(trails[edge] || { permanent: false, streak: 0 }), usedThisSeason: true, lastSeasonTouched: currentSeason };
      } else if (deletedTrails.includes(edge)) {
        // Rediscovery/paradox
        if (!dryRun) {
          trails[edge] = { permanent: false, streak: 0, usedThisSeason: true, lastSeasonTouched: currentSeason };
        }
        rediscovered.push(edge);
        usedFlags[edge] = true;
        before[edge] = undefined;
        after[edge] = { permanent: false, streak: 0, usedThisSeason: true, lastSeasonTouched: currentSeason };
      }
    }
  }
  // For dryRun, simulate before state from trails
  if (dryRun) {
    for (const edge of affected) {
      if (!before[edge] && trails[edge]) before[edge] = { ...trails[edge] };
    }
  }
  return {
    effects: { created, usedFlags, rediscovered },
    before,
    after
  };
}

import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { deriveSeasonId, normalizeSeasonId, compareSeasonIds } from '../lib/season';
import { hexSort, normalizeHexId } from '../../../../lib/hexes';
import { getRepoPath } from '../../../../lib/repo';
import { readJsonl } from '../../scribe/lib/jsonl';
import type { CanonicalDate, Event } from '../../scribe/types';

// TODO: Use Enquirer for prompts when candidates exist

const META_PATH = getRepoPath('data', 'meta.yaml');
const SESSION_LOGS_DIR = getRepoPath('data', 'session-logs');
const SESSIONS_DIR = path.join(SESSION_LOGS_DIR, 'sessions');
const ROLLOVERS_DIR = path.join(SESSION_LOGS_DIR, 'rollovers');

function canonicalEdgeKey(a: string, b: string): string {
  const [h1, h2] = [normalizeHexId(a), normalizeHexId(b)].sort(hexSort);
  return `${h1.toLowerCase()}-${h2.toLowerCase()}`;
}

function getMostRecentRolloverFootprint(seasonId: string): any | null {
  const footprintsDir = getRepoPath('data', 'session-logs', 'footprints');
  let files: string[] = [];
  try {
    files = fs.readdirSync(footprintsDir)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map(f => path.join(footprintsDir, f));
  } catch {
    return null;
  }
  // Find the most recent rollover for this season or earlier
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

function getSessionSeasonId(events: Event[]): string | null {
  const dayStart = events.find(e => e.kind === 'day_start');
  if (!dayStart) return null;
  const date = dayStart.payload.calendarDate as CanonicalDate;
  return deriveSeasonId(date);
}

function hexDistance(a: string, b: string): number {
  const ac = hexToCube(a);
  const bc = hexToCube(b);
  return Math.max(Math.abs(ac.x - bc.x), Math.abs(ac.y - bc.y), Math.abs(ac.z - bc.z));
}

function hexToCube(hex: string): { x: number, y: number, z: number } {
  // Flat-top odd-q offset to cube
  // Columns: letters A-Z, Rows: 1-27
  const col = hex[0].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
  const row = parseInt(hex.slice(1), 10) - 1;
  const x = col;
  const z = row - ((col - (col & 1)) >> 1);
  const y = -x - z;
  return { x, y, z };
}

function isHexNearAnyHaven(hex: string, havens: string[], maxDist = 3): boolean {
  return havens.some(haven => hexDistance(hex, haven) <= maxDist);
}

function isRolloverFile(filePath: string): boolean {
  const dir = path.basename(path.dirname(filePath));
  const base = path.basename(filePath);
  return dir === 'rollovers' && /^rollover_[\w-]+_\d{4}-\d{2}-\d{2}.*\.jsonl$/i.test(base);
}

function isSessionFile(filePath: string): boolean {
  const dir = path.basename(path.dirname(filePath));
  const base = path.basename(filePath);
  return dir === 'sessions' && /^session_\d+_\d{4}-\d{2}-\d{2}.*\.jsonl$/i.test(base);
}

function listFilesIfDir(dir: string): string[] {
  try {
    return fs.readdirSync(dir).map(f => path.join(dir, f));
  } catch {
    return [];
  }
}

function loadMeta() {
  try {
    return yaml.parse(fs.readFileSync(META_PATH, 'utf8')) as any;
  } catch {
    return { appliedSessions: [], rolledSeasons: [] };
  }
}

function loadTrails(): Record<string, any> {
  const trailsPath = getRepoPath('data', 'trails.yml');
  try {
    return yaml.parse(fs.readFileSync(trailsPath, 'utf8')) as Record<string, any>;
  } catch {
    return {};
  }
}

export async function plan(fileArg?: string) {
  const meta = loadMeta();
  let file = fileArg;

  if (!file) {
    // List candidate session and rollover files
    const sessionFiles = listFilesIfDir(SESSIONS_DIR).filter(f => f.endsWith('.jsonl'));
    const rolloverFiles = listFilesIfDir(ROLLOVERS_DIR).filter(f => f.endsWith('.jsonl'));
    const allCandidates = [...sessionFiles, ...rolloverFiles].filter(f => {
      const id = path.basename(f);
      return !meta.appliedSessions?.includes(id);
    });
    if (allCandidates.length === 0) {
      console.log('No unapplied session or rollover files found.');
      process.exit(5);
    }
    // TODO: Prompt user to select a file (Enquirer)
    file = allCandidates[0]; // For now, just pick the first
    console.log(`Planning for: ${file}`);
  }

  // File type detection
  if (isRolloverFile(file)) {
    // --- Rollover planning: detect and parse ---
    const events = readJsonl(file);
    const rollover = events.find(e => e.kind === 'season_rollover') as Event & { payload: { seasonId: string } } | undefined;
    if (!rollover || !rollover.payload.seasonId) {
      console.error('Validation error: Rollover file missing season_rollover event or seasonId.');
      process.exit(4);
    }
    const seasonId = normalizeSeasonId(rollover.payload.seasonId);
    console.log(`Rollover plan for season: ${seasonId}`);

    // Already applied check
    const fileId = path.basename(file);
    if (meta.appliedSessions?.includes(fileId)) {
      console.log('Rollover already applied.');
      process.exit(3);
    }

    // --- Load trails and havens ---
    const trails = loadTrails();
    const havensPath = getRepoPath('data', 'havens.yml');
    let havens: string[] = [];
    try {
      havens = yaml.parse(fs.readFileSync(havensPath, 'utf8')) as string[];
    } catch {
      havens = [];
    }
    const nonPermanentEdges = Object.entries(trails).filter(([_, data]) => !data.permanent);
    console.log(`Non-permanent edges: ${nonPermanentEdges.length}`);
    console.log(`Haven hexes: ${havens.length}`);

    // --- Classify edges as near or far ---
    let nearCount = 0;
    let farCount = 0;
    const maintained: string[] = [];
    const persisted: string[] = [];
    const deleted: string[] = [];
    for (const [edge, data] of nonPermanentEdges) {
      const [a, b] = edge.split('-');
      const isNear = isHexNearAnyHaven(a, havens) || isHexNearAnyHaven(b, havens);
      if (isNear) {
        nearCount++;
        maintained.push(edge);
      } else {
        farCount++;
        if (data.usedThisSeason) {
          persisted.push(edge);
        } else {
          // For plan, show both possible d6 outcomes
          deleted.push(`${edge} (if d6=1-3)`);
          persisted.push(`${edge} (if d6=4-6)`);
        }
      }
    }
    // No-op check: if all lists are empty, exit 5
    if (maintained.length === 0 && persisted.length === 0 && deleted.length === 0) {
      console.log('No changes would be made.');
      process.exit(5);
    }
    console.log(`Near-haven edges (≤3): ${nearCount}`);
    console.log(`Far-haven edges (>3): ${farCount}`);
    console.log(`Maintained (near): ${maintained.length}`);
    console.log(`Persisted (far, used or lucky): ${persisted.length}`);
    console.log(`Deleted (far, unused, unlucky): ${deleted.length}`);
    // Always output sample lists for clarity
    console.log('  Sample maintained:', maintained.slice(0, 5));
    console.log('  Sample persisted:', persisted.slice(0, 5));
    console.log('  Sample deleted:', deleted.slice(0, 5));

    process.exit(0);
  } else if (isSessionFile(file)) {
    // --- Session planning logic ---
    const events = readJsonl(file);
    if (!events.length) {
      console.error('Session file is empty or unreadable.');
      process.exit(4);
    }

    const dayStarts = events.filter(e => e.kind === 'day_start');
    if (!dayStarts.length) {
      console.error('Validation error: No day_start event in session.');
      process.exit(4);
    }

    // All day_start events must have the same seasonId
    const seasonIds = dayStarts.map(e => deriveSeasonId(e.payload.calendarDate as any));
    const firstSeasonId = seasonIds[0];
    if (!seasonIds.every(sid => normalizeSeasonId(sid) === normalizeSeasonId(firstSeasonId))) {
      console.error('Validation error: Multi-season session detected. All events must share the same season.');
      process.exit(4);
    }

    // Chronology check: all required rollovers must be present
    const requiredRollovers = [];
    // Find all seasons up to and including this one, and check meta.rolledSeasons
    // (For now, just check that this seasonId is in meta.rolledSeasons)
    if (!meta.rolledSeasons?.includes(firstSeasonId)) {
      console.error(`Validation error: Missing required rollover for season ${firstSeasonId}.`);
      process.exit(4);
    }
    // Already applied check
    const fileId = path.basename(file);
    if (meta.appliedSessions?.includes(fileId)) {
      console.log('Session already applied.');
      process.exit(3);
    }
    // Simulate plan
    const trails = loadTrails();
    const mostRecentRoll = getMostRecentRolloverFootprint(firstSeasonId);
    const deletedTrails = mostRecentRoll?.effects?.rollover?.deletedTrails || [];
    const created: string[] = [];
    const usedFlags: Record<string, boolean> = {};
    const rediscovered: string[] = [];
    let currentHex: string | null = null;
    // Find session_start
    const sessionStart = events.find(e => e.kind === 'session_start');
    if (sessionStart && sessionStart.payload.startHex) {
      currentHex = sessionStart.payload.startHex as string;
    }
    for (const e of events) {
      if (e.kind === 'trail' && e.payload.marked) {
        const edge = canonicalEdgeKey(e.payload.from as string, e.payload.to as string);
        created.push(edge);
        usedFlags[edge] = true;
      }
      if (e.kind === 'move') {
        let from = e.payload.from as string | null;
        let to = e.payload.to as string;
        if (!from && currentHex) from = currentHex;
        if (!from || !to) continue; // skip invalid
        const edge = canonicalEdgeKey(from, to);
        currentHex = to;
        if (trails[edge]) {
          usedFlags[edge] = true;
        } else if (deletedTrails.includes(edge)) {
          rediscovered.push(edge);
          usedFlags[edge] = true;
        }
      }
    }
    // Output summary
    console.log('Plan summary:');
    if (created.length) {
      console.log('  Edges to create:', created);
    }
    if (Object.keys(usedFlags).length) {
      console.log('  Edges to set usedThisSeason:', Object.keys(usedFlags));
    }
    if (rediscovered.length) {
      console.log('  Rediscovered edges:', rediscovered);
    }
    if (!created.length && !Object.keys(usedFlags).length && !rediscovered.length) {
      console.log('No changes would be made.');
      process.exit(5);
    }
    process.exit(0);
  } else {
    console.error('Unrecognized file type for planning.');
    process.exit(4);
  }
}

import { hexSort, normalizeHexId, rollDice } from '@skyreach/core';
import { cloneDeep } from 'lodash-es';

export function applyRolloverToTrails(
  trails: Record<string, any>,
  havens: string[],
  dryRun = false,
) {
  // Work on a deep copy to ensure purity
  const newTrails = cloneDeep(trails);
  const maintained: string[] = [];
  const persisted: string[] = [];
  const deletedTrails: string[] = [];
  const farChecks: Record<string, any> = {};
  for (const [edge, data] of Object.entries(newTrails)) {
    if (data.permanent) continue;
    const [a, b] = edge.split('-');
    const isNear = isHexNearAnyHaven(a, havens) || isHexNearAnyHaven(b, havens);
    if (isNear) {
      data.streak = Math.min(3, (data.streak || 0) + 1);
      if (data.streak === 3) data.permanent = true;
      maintained.push(edge);
    } else {
      if (data.usedThisSeason) {
        data.streak = Math.min(3, (data.streak || 0) + 1);
        persisted.push(edge);
        farChecks[edge] = { outcome: `persist-streak=${data.streak}` };
      } else {
        if (dryRun) {
          deletedTrails.push(`${edge} (if d6=1-3)`);
          persisted.push(`${edge} (if d6=4-6)`);
          farChecks[edge] = {
            d6: '1-3/4-6',
            outcome: 'deleted/persist-streak=0',
          };
        } else {
          const d6 = rollDice('1d6');
          if (d6 <= 3) {
            deletedTrails.push(edge);
            farChecks[edge] = { d6, outcome: 'deleted' };
            delete newTrails[edge];
            continue;
          } else {
            data.streak = 0;
            persisted.push(edge);
            farChecks[edge] = { d6, outcome: 'persist-streak=0' };
          }
        }
      }
    }
  }
  // After processing, reset usedThisSeason on all remaining (non-permanent) edges
  for (const [edge, data] of Object.entries(newTrails)) {
    if (!data.permanent) {
      data.usedThisSeason = false;
    }
  }
  return { trails: newTrails, maintained, persisted, deletedTrails, farChecks };
}

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
  const sessionStart = events.find((e) => e.kind === 'session_start');
  if (sessionStart && sessionStart.payload && sessionStart.payload.startHex) {
    currentHex = sessionStart.payload.startHex as string;
  }
  const affected = new Set<string>();
  for (const e of events) {
    if (e.kind === 'day_start') {
      if (e.payload && e.payload.calendarDate && e.payload.season) {
        currentSeason = e.payload.seasonId || seasonId;
      }
    }
    if (e.kind === 'trail' && e.payload && e.payload.marked) {
      const edge = canonicalEdgeKey(
        e.payload.from as string,
        e.payload.to as string,
      );
      affected.add(edge);
      if (!dryRun && !trails[edge]) {
        trails[edge] = { permanent: false, streak: 0 };
      }
      if (!trails[edge] && dryRun) {
        created.push(edge);
        usedFlags[edge] = true;
        after[edge] = {
          permanent: false,
          streak: 0,
          usedThisSeason: true,
          lastSeasonTouched: currentSeason,
        };
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
      before[edge] =
        before[edge] || (trails[edge] ? { ...trails[edge] } : undefined);
      after[edge] = {
        ...(trails[edge] || { permanent: false, streak: 0 }),
        usedThisSeason: true,
        lastSeasonTouched: currentSeason,
      };
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
        before[edge] =
          before[edge] || (trails[edge] ? { ...trails[edge] } : undefined);
        after[edge] = {
          ...(trails[edge] || { permanent: false, streak: 0 }),
          usedThisSeason: true,
          lastSeasonTouched: currentSeason,
        };
      } else if (deletedTrails.includes(edge)) {
        if (!dryRun) {
          trails[edge] = {
            permanent: false,
            streak: 0,
            usedThisSeason: true,
            lastSeasonTouched: currentSeason,
          };
        }
        rediscovered.push(edge);
        usedFlags[edge] = true;
        before[edge] = undefined;
        after[edge] = {
          permanent: false,
          streak: 0,
          usedThisSeason: true,
          lastSeasonTouched: currentSeason,
        };
      }
    }
  }
  if (dryRun) {
    for (const edge of affected) {
      if (!before[edge] && trails[edge]) before[edge] = { ...trails[edge] };
    }
  }
  return {
    effects: { created, usedFlags, rediscovered },
    before,
    after,
  };
}

export function canonicalEdgeKey(a: string, b: string): string {
  const [h1, h2] = [normalizeHexId(a), normalizeHexId(b)].sort(hexSort);
  return `${h1.toLowerCase()}-${h2.toLowerCase()}`;
}

export function hexDistance(a: string, b: string): number {
  const ac = hexToCube(a);
  const bc = hexToCube(b);
  return Math.max(
    Math.abs(ac.x - bc.x),
    Math.abs(ac.y - bc.y),
    Math.abs(ac.z - bc.z),
  );
}

export function hexToCube(hex: string): { x: number; y: number; z: number } {
  const col = hex[0].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
  const row = parseInt(hex.slice(1), 10) - 1;
  const x = col;
  const z = row - ((col - (col & 1)) >> 1);
  const y = -x - z;
  return { x, y, z };
}

export function isHexNearAnyHaven(
  hex: string,
  havens: string[],
  maxDist = 3,
): boolean {
  return havens.some((haven) => hexDistance(hex, haven) <= maxDist);
}

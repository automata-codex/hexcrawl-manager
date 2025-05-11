/**
 * After running the "elevation solver" script and generating manual elevation
 * tweaks, this script makes a final pass over the elevation data to sanity-
 * check the min and max values.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const HEX_DIR = '/Users/alexgs/projects/skyreach/data/hexes';
const PATCH_DIR = '/Users/alexgs/projects/skyreach/data/patches/elevation';
const OUTPUT_PATCH = path.join(PATCH_DIR, '99-elevation-finalizer-patch.yaml');
const MANUAL_PATCHES = [
  path.join(PATCH_DIR, '10-manual-canyon-elevations.yaml'),
  path.join(PATCH_DIR, '12-manual-dark-swamp-elevations.yaml'),
];

const MIN_SPREAD_BY_TERRAIN = {
  mountains: 1000,
  peak: 1000,
  rocky: 600,
  hills: 400,
  plains: 150,
  wetland: 100,
  lake: 50,
  ocean: 0,
};

const SYNTHETIC_EDGES = {
  'a0': 1000,
  'b0': 1000,
  't0': 11000,
  'x26': 8000,
  'x27': 2000,
};

function syntheticEdgeElevation(col, row) {
  const id = `${col}${row}`;
  if (SYNTHETIC_EDGES[id]) return SYNTHETIC_EDGES[id];
  if (row === 0) return 10000;
  if (col === 'x') return 9500;
  return 0;
}

function loadYAML(filePath) {
  return yaml.parse(fs.readFileSync(filePath, 'utf-8'));
}

function loadHexes() {
  const hexes = {};
  for (const region of fs.readdirSync(HEX_DIR)) {
    const regionPath = path.join(HEX_DIR, region);
    if (!fs.lstatSync(regionPath).isDirectory()) continue;
    for (const file of fs.readdirSync(regionPath)) {
      if (!file.endsWith('.yaml')) continue;
      const data = loadYAML(path.join(regionPath, file));
      hexes[data.id] = data;
    }
  }
  return hexes;
}

function loadManualOverrides(paths) {
  const result = {};
  for (const file of paths) {
    if (!fs.existsSync(file)) continue;
    const patch = loadYAML(file);
    for (const [id, entry] of Object.entries(patch)) {
      result[id] = { ...(result[id] || {}), ...entry };
    }
  }
  return result;
}

function parseHexId(hexId) {
  const col = hexId[0];
  const row = parseInt(hexId.slice(1), 10);
  if (!col || isNaN(row)) {
    throw new Error(`Unable to parse hex ID "${hexId}"`);
  }
  return { col, row };
}

function getNeighborIds(hexId) {
  const pos = parseHexId(hexId);
  if (!pos) return [];
  const colIdx = pos.col.charCodeAt(0) - 'a'.charCodeAt(0);
  const even = colIdx % 2 === 0;
  const offsets = even
    ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]
    : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];

  return offsets.map(([dc, dr]) => {
    const col = String.fromCharCode(colIdx + dc + 'a'.charCodeAt(0));
    const row = pos.row + dr;
    return `${col}${row}`;
  });
}

function initElevationState(hexes, manual) {
  const state = new Map();
  for (const [id, hex] of Object.entries(hexes)) {
    const entry = {
      avg: hex.avgElevation,
      terrain: (hex.terrain || '').toLowerCase(),
      biome: hex.biome,
      min: manual[id]?.minElevation ?? hex.avgElevation,
      max: manual[id]?.maxElevation ?? hex.avgElevation,
      fixedMin: manual[id]?.minElevation != null,
      fixedMax: manual[id]?.maxElevation != null,
    };
    if (entry.biome === 'coastal-ocean') {
      entry.min = entry.max = entry.avg = 0;
      entry.fixedMin = entry.fixedMax = true;
    }
    state.set(id, entry);
  }
  return state;
}

function runRefinement(hexes, state, maxStep = 100) {
  let pass = 0;
  while (true) {
    let totalDelta = 0;
    for (const [id, h] of state.entries()) {
      if (h.fixedMin && h.fixedMax) continue;

      const neighbors = getNeighborIds(id).map(nid => {
        const n = state.get(nid);
        if (n) return n.avg;
        const { col, row } = parseHexId(nid);
        return syntheticEdgeElevation(col, row);
      }).filter(n => n != null);

      const slope = Math.max(...neighbors.map(n => Math.abs(n - h.avg)), 0);
      const spread = Math.max(MIN_SPREAD_BY_TERRAIN[h.terrain] || 300, slope * 0.8);

      let targetMin = h.fixedMin ? h.min : Math.round(h.avg - spread / 2);
      let targetMax = h.fixedMax ? h.max : Math.round(h.avg + spread / 2);

      const lowestNeighborMax = Math.min(...neighbors.map(n => n + spread / 2));
      const highestNeighborMin = Math.max(...neighbors.map(n => n - spread / 2));
      if (!h.fixedMin) targetMin = Math.max(0, Math.min(targetMin, lowestNeighborMax));
      if (!h.fixedMax) targetMax = Math.max(targetMax, highestNeighborMin);

      const deltaMin = h.fixedMin ? 0 : Math.max(-maxStep, Math.min(maxStep, targetMin - h.min));
      const deltaMax = h.fixedMax ? 0 : Math.max(-maxStep, Math.min(maxStep, targetMax - h.max));

      const prevMin = h.min;
      h.min += deltaMin;
      if (!h.fixedMin) {
        h.min = Math.max(0, h.min);
      }

      const prevMax = h.max;
      h.max += deltaMax;
      if (!h.fixedMax && h.min === 0 && h.max - h.min < spread) {
        h.max = h.min + spread;
      }

      totalDelta += Math.abs(h.max - prevMax) + Math.abs(h.min - prevMin);
    }
    console.log(`Pass ${++pass}: total change = ${totalDelta}`);
    if (totalDelta === 0) {
      console.log('Converged.');
      break;
    }
  }
}

function writePatch(state) {
  const sorted = [...state.entries()].sort(([a], [b]) => a.localeCompare(b));
  const patch = {};
  for (const [id, val] of sorted) {
    patch[id] = {
      minElevation: val.min,
      maxElevation: val.max,
    };
  }
  fs.writeFileSync(OUTPUT_PATCH, yaml.stringify(patch), 'utf-8');
  console.log(`Patch written to ${OUTPUT_PATCH}`);
}

function run() {
  const hexes = loadHexes();
  const manual = loadManualOverrides(MANUAL_PATCHES);
  const state = initElevationState(hexes, manual);
  runRefinement(hexes, state);
  writePatch(state);
}

run();

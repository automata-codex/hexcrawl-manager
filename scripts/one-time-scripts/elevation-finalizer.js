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

const syntheticEdgeElevation = (col, row) => {
  const id = `${col}${row}`;
  if (SYNTHETIC_EDGES[id]) return SYNTHETIC_EDGES[id];
  if (row === 0) return 10000; // alpine-tundra
  if (col === 'x') return 9500; // alpine-tundra
  console.log(`Warning: synthetic edge elevation for ${id} not found`);
  return 0; // ocean beyond map
};

const loadYAML = (filePath) => {
  const text = fs.readFileSync(filePath, 'utf-8');
  return yaml.parse(text);
};

const loadHexes = () => {
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
};

const loadManualOverrides = () => {
  const overrides = {};
  for (const patchPath of MANUAL_PATCHES) {
    if (!fs.existsSync(patchPath)) continue;
    const patch = loadYAML(patchPath);
    for (const [hexId, values] of Object.entries(patch)) {
      overrides[hexId] = { ...(overrides[hexId] || {}), ...values };
    }
  }
  return overrides;
};

const parseHexId = (hexId) => {
  const match = /^([a-z]+)(\d+)$/.exec(hexId);
  if (!match) return null;
  return { col: match[1], row: parseInt(match[2], 10) };
};

const getNeighbors = (hexId, allHexes) => {
  const pos = parseHexId(hexId);
  if (!pos) return [];
  const colIdx = pos.col.charCodeAt(0) - 'a'.charCodeAt(0);
  const even = colIdx % 2 === 0;
  const offsets = even
    ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]
    : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];

  return offsets.map(([dc, dr]) => {
    const newColIdx = colIdx + dc;
    const col = String.fromCharCode(newColIdx + 'a'.charCodeAt(0));
    const row = pos.row + dr;
    const id = `${col}${row}`;
    return allHexes[id] ? { id, elev: allHexes[id].avgElevation } : { id, elev: syntheticEdgeElevation(col, row) };
  }).filter(n => n.elev !== null);
};

const finalizeElevations = () => {
  const hexes = loadHexes();
  const manual = loadManualOverrides();
  const patch = {};

  for (const [hexId, hex] of Object.entries(hexes)) {
    const overrides = manual[hexId] || {};
    const biome = hex.biome;
    const terrain = (hex.terrain || '').toLowerCase();
    const avg = hex.avgElevation;

    if (biome === 'coastal-ocean') {
      patch[hexId] = { minElevation: 0, maxElevation: 0, avgElevation: 0 };
      continue;
    }

    const neighbors = getNeighbors(hexId, hexes);
    const neighborAvgs = neighbors.map(n => n.elev).filter(n => n != null);
    const slope = Math.max(...neighborAvgs.map(n => Math.abs(n - avg)), 0);
    const spread = Math.max(MIN_SPREAD_BY_TERRAIN[terrain] || 300, slope * 0.8);

    const min = overrides.minElevation ?? Math.round(avg - spread / 2);
    const max = overrides.maxElevation ?? Math.round(avg + spread / 2);

    patch[hexId] = {
      minElevation: min,
      maxElevation: max,
    };
  }

  const sortedPatch = Object.fromEntries(
    Object.entries(patch).sort(([a], [b]) => a.localeCompare(b))
  );
  const yamlText = yaml.stringify(sortedPatch);
  fs.writeFileSync(OUTPUT_PATCH, yamlText, 'utf-8');
  console.log(`Elevation patch written to ${OUTPUT_PATCH}`);
};

finalizeElevations();

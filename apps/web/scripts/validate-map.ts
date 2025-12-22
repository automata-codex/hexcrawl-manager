#!/usr/bin/env tsx
/**
 * Validate map configuration and hex/region consistency.
 *
 * This script validates:
 * - map.yaml exists and is valid
 * - All region hex lists reference valid hex IDs
 * - No hex is assigned to multiple regions
 * - Hex files reference valid coordinates within grid bounds
 * - Regions with hexes have default terrain/biome (warning)
 *
 * Usage:
 *   tsx scripts/validate-map.ts
 *   npm run validate:map
 */

import {
  formatHexId,
  isOutOfBounds,
  isValidHexFormat,
  isWithinGrid,
  normalizeHexId,
  parseHexId,
} from '@achm/core';
import { loadMapConfig, mapConfigExists } from '@achm/data';
import { HexSchema, RegionSchema } from '@achm/schemas';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';

import { getDataPath } from '@achm/data';

const DATA_DIR = getDataPath();

interface ValidationResult {
  errors: string[];
  warnings: string[];
}

interface HexFile {
  id: string;
  path: string;
}

interface RegionFile {
  id: string;
  hexes?: string[];
  terrain?: string;
  biome?: string;
}

function loadAllRegions(): RegionFile[] {
  const regionsDir = path.join(DATA_DIR, 'regions');
  if (!fs.existsSync(regionsDir)) {
    return [];
  }

  const files = fs.readdirSync(regionsDir).filter(
    (f) => f.endsWith('.yml') || f.endsWith('.yaml'),
  );

  const regions: RegionFile[] = [];
  for (const file of files) {
    const filePath = path.join(regionsDir, file);
    const content = yaml.parse(fs.readFileSync(filePath, 'utf-8'));
    const result = RegionSchema.safeParse(content);
    if (result.success) {
      regions.push({
        id: result.data.id,
        hexes: result.data.hexes,
        terrain: result.data.terrain,
        biome: result.data.biome,
      });
    }
  }
  return regions;
}

function loadAllHexFiles(): HexFile[] {
  const hexesDir = path.join(DATA_DIR, 'hexes');
  if (!fs.existsSync(hexesDir)) {
    return [];
  }

  const hexFiles: HexFile[] = [];

  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml')) {
        const content = yaml.parse(fs.readFileSync(fullPath, 'utf-8'));
        const result = HexSchema.safeParse(content);
        if (result.success) {
          hexFiles.push({
            id: result.data.id,
            path: fullPath,
          });
        }
      }
    }
  }

  scanDir(hexesDir);
  return hexFiles;
}

function validateMap(): ValidationResult {
  const result: ValidationResult = { errors: [], warnings: [] };

  // Check if map.yaml exists
  if (!mapConfigExists()) {
    result.warnings.push(
      'map.yaml not found. Map validation skipped. ' +
        'Create map.yaml to enable full validation.',
    );
    return result;
  }

  // Load and validate map config
  let mapConfig;
  try {
    mapConfig = loadMapConfig();
  } catch (e) {
    result.errors.push(`Failed to load map.yaml: ${(e as Error).message}`);
    return result;
  }

  const { grid, outOfBounds } = mapConfig;
  const notation = grid.notation;

  // Load all regions and hex files
  const regions = loadAllRegions();
  const hexFiles = loadAllHexFiles();

  // Build set of all valid hex IDs from grid config
  const allGridHexes = new Set<string>();
  for (let col = 0; col < grid.columns; col++) {
    for (let row = 0; row < grid.rows; row++) {
      const id = formatHexId({ col, row }, notation);
      if (!isOutOfBounds(id, outOfBounds, notation)) {
        allGridHexes.add(id);
      }
    }
  }

  // Build map of hex -> region assignments
  const hexToRegion = new Map<string, string[]>();
  for (const region of regions) {
    if (!region.hexes) continue;
    for (const hexId of region.hexes) {
      // Validate hex ID format
      if (!isValidHexFormat(hexId, notation)) {
        result.errors.push(
          `Region ${region.id}: Invalid hex ID format "${hexId}"`,
        );
        continue;
      }

      const normalized = normalizeHexId(hexId, notation);

      // Validate hex is within grid bounds
      const coord = parseHexId(hexId, notation);
      if (!isWithinGrid(coord, grid)) {
        result.errors.push(
          `Region ${region.id}: Hex "${hexId}" is outside grid bounds`,
        );
        continue;
      }

      // Validate hex is not out-of-bounds
      if (isOutOfBounds(normalized, outOfBounds, notation)) {
        result.errors.push(
          `Region ${region.id}: Hex "${hexId}" is marked as out-of-bounds`,
        );
        continue;
      }

      // Track assignment
      const existing = hexToRegion.get(normalized) || [];
      existing.push(region.id);
      hexToRegion.set(normalized, existing);
    }
  }

  // Check for multi-region assignments
  for (const [hexId, regionIds] of hexToRegion) {
    if (regionIds.length > 1) {
      result.errors.push(
        `Hex ${hexId} assigned to multiple regions: ${regionIds.join(', ')}`,
      );
    }
  }

  // Check for unassigned hexes (warning, not error)
  for (const hexId of allGridHexes) {
    if (!hexToRegion.has(hexId)) {
      result.warnings.push(`Hex ${hexId} is not assigned to any region`);
    }
  }

  // Validate hex files reference valid coordinates
  for (const hexFile of hexFiles) {
    if (!isValidHexFormat(hexFile.id, notation)) {
      result.errors.push(
        `Hex file ${hexFile.path}: Invalid ID format "${hexFile.id}"`,
      );
      continue;
    }

    const coord = parseHexId(hexFile.id, notation);
    if (!isWithinGrid(coord, grid)) {
      result.errors.push(
        `Hex file ${hexFile.path}: ID "${hexFile.id}" is outside grid bounds`,
      );
    }

    const normalized = normalizeHexId(hexFile.id, notation);
    if (isOutOfBounds(normalized, outOfBounds, notation)) {
      result.errors.push(
        `Hex file ${hexFile.path}: ID "${hexFile.id}" is marked as out-of-bounds`,
      );
    }
  }

  // Validate region defaults
  for (const region of regions) {
    if (region.hexes && region.hexes.length > 0) {
      if (!region.terrain) {
        result.warnings.push(
          `Region ${region.id} has hexes but no default terrain`,
        );
      }
      if (!region.biome) {
        result.warnings.push(
          `Region ${region.id} has hexes but no default biome`,
        );
      }
    }
  }

  return result;
}

function main(): void {
  console.log('Validating map configuration...\n');

  const result = validateMap();

  // Print warnings
  if (result.warnings.length > 0) {
    console.log('Warnings:');
    for (const warning of result.warnings) {
      console.log(`  ⚠️  ${warning}`);
    }
    console.log('');
  }

  // Print errors
  if (result.errors.length > 0) {
    console.error('Errors:');
    for (const error of result.errors) {
      console.error(`  ❌ ${error}`);
    }
    console.error('\nMap validation failed!\n');
    process.exit(1);
  }

  if (result.warnings.length === 0) {
    console.log('✅ Map configuration validated successfully!\n');
  } else {
    console.log('Map configuration validated with warnings.\n');
  }
  process.exit(0);
}

main();

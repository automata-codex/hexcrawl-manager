#!/usr/bin/env tsx
/**
 * Validate Faction Territory Hexes
 *
 * Faction `hexes` is an overlay CLAIM, not a partition (unlike region.hexes):
 * overlaps across factions are allowed (contested hexes), coverage is not
 * exhaustive, and it drives no terrain/biome defaults. This validator therefore
 * checks ONLY that each claimed hex is well-formed and in-bounds. It deliberately
 * does NOT check uniqueness or coverage — that contract is region-only and lives
 * in validate-map.ts (which iterates region.hexes and never touches factions).
 *
 * Usage:
 *   tsx scripts/validate-faction-hexes.ts
 *   npm run validate:faction-hexes
 */

import {
  isOutOfBounds,
  isValidHexFormat,
  isWithinGrid,
  normalizeHexId,
  parseHexId,
} from '@achm/core';
import { loadMapConfig, mapConfigExists, resolveDataPath } from '@achm/data';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'yaml';

interface FactionData {
  id: string;
  hexes?: string[];
}

function loadYamlFile<T>(filePath: string): T | null {
  try {
    return yaml.parse(readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return null;
  }
}

function loadFactions(): FactionData[] {
  const factionsDir = resolveDataPath('factions');
  if (!existsSync(factionsDir)) {
    return [];
  }

  const files = readdirSync(factionsDir).filter(
    (f) => f.endsWith('.yml') || f.endsWith('.yaml'),
  );

  const factions: FactionData[] = [];
  for (const file of files) {
    const data = loadYamlFile<FactionData>(join(factionsDir, file));
    if (data) {
      factions.push(data);
    }
  }
  return factions;
}

function validateFactionHexes(): string[] {
  const errors: string[] = [];

  // Nothing to validate against without a grid; validate-map.ts already warns.
  if (!mapConfigExists()) {
    return errors;
  }

  const { grid, outOfBounds } = loadMapConfig();
  const notation = grid.notation;

  for (const faction of loadFactions()) {
    if (!faction.hexes) continue; // the territory claim is optional

    for (const hexId of faction.hexes) {
      if (!isValidHexFormat(hexId, notation)) {
        errors.push(`Faction ${faction.id}: Invalid hex ID format "${hexId}"`);
        continue;
      }

      const coord = parseHexId(hexId, notation);
      if (!isWithinGrid(coord, grid)) {
        errors.push(
          `Faction ${faction.id}: Hex "${hexId}" is outside grid bounds`,
        );
        continue;
      }

      const normalized = normalizeHexId(hexId, notation);
      if (isOutOfBounds(normalized, outOfBounds, notation)) {
        errors.push(
          `Faction ${faction.id}: Hex "${hexId}" is marked as out-of-bounds`,
        );
      }

      // Overlaps across factions are intentionally allowed (contested hexes):
      // do NOT add a uniqueness/coverage check here.
    }
  }

  return errors;
}

function main(): void {
  console.log('Validating faction territory hexes...\n');

  const errors = validateFactionHexes();

  if (errors.length > 0) {
    console.error('Errors:');
    for (const error of errors) {
      console.error(`  ❌ ${error}`);
    }
    console.error('\nFaction hex validation failed!\n');
    process.exit(1);
  }

  console.log('✅ Faction territory hexes validated successfully!\n');
  process.exit(0);
}

main();

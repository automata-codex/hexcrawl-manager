#!/usr/bin/env tsx
/**
 * Validate Faction Territory Hexes
 *
 * Faction `hexes` is a list of hex specs (single IDs, rectangles, radii and
 * exclusions; see `expandHexSpecs` in @achm/core). Each spec is checked for
 * shape by the schema, then expanded against the map config, which checks
 * notation, grid bounds and out-of-bounds hexes.
 *
 * Faction `hexes` is an overlay CLAIM, not a partition (unlike region.hexes):
 * overlaps across factions are allowed (contested hexes), coverage is not
 * exhaustive, and it drives no terrain/biome defaults. This validator
 * deliberately does NOT check uniqueness or coverage — that contract is
 * region-only and lives in validate-map.ts.
 *
 * Usage:
 *   tsx scripts/validate-faction-hexes.ts
 *   npm run validate:faction-hexes
 */

import { expandHexSpecs } from '@achm/core';
import { loadMapConfig, mapConfigExists, resolveDataPath } from '@achm/data';
import { HexSpecSchema } from '@achm/schemas';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'yaml';

import type { MapConfig } from '@achm/schemas';

interface RawFaction {
  id?: unknown;
  hexes?: unknown;
}

function loadFactions(): Array<{ file: string; data: RawFaction }> {
  const factionsDir = resolveDataPath('factions');
  if (!existsSync(factionsDir)) {
    return [];
  }

  const files = readdirSync(factionsDir).filter(
    (f) => f.endsWith('.yml') || f.endsWith('.yaml'),
  );

  const factions: Array<{ file: string; data: RawFaction }> = [];
  for (const file of files) {
    try {
      const data = yaml.parse(readFileSync(join(factionsDir, file), 'utf-8'));
      if (data && typeof data === 'object') {
        factions.push({ file, data: data as RawFaction });
      }
    } catch {
      // Unparseable YAML is reported by the general config validator.
    }
  }
  return factions;
}

function validateFactionHexes(): string[] {
  const errors: string[] = [];
  const claiming = loadFactions().filter(({ data }) => data.hexes !== undefined);

  if (claiming.length === 0) {
    return errors;
  }

  // Hex specs can only be expanded against a map config.
  if (!mapConfigExists()) {
    const ids = claiming.map(({ data, file }) => String(data.id ?? file)).join(', ');
    errors.push(`map.yaml not found; cannot validate territory hexes for: ${ids}`);
    return errors;
  }

  const config: MapConfig = loadMapConfig();

  for (const { file, data } of claiming) {
    const label = `Faction ${String(data.id ?? file)}`;

    if (!Array.isArray(data.hexes)) {
      errors.push(`${label}: hexes must be a list`);
      continue;
    }

    // Parse each entry through the schema so unquoted numeric IDs (YAML
    // numbers) are restored exactly as the web build sees them. Entries are
    // checked one at a time so a malformed spec doesn't hide errors in the rest.
    const specs: string[] = [];
    data.hexes.forEach((entry: unknown, index: number) => {
      const parsed = HexSpecSchema.safeParse(entry);
      if (parsed.success) {
        specs.push(parsed.data);
      } else {
        for (const issue of parsed.error.issues) {
          errors.push(`${label} (hexes[${index}] ${JSON.stringify(entry)}): ${issue.message}`);
        }
      }
    });

    const { errors: specErrors } = expandHexSpecs(specs, config);
    for (const message of specErrors) {
      errors.push(`${label}: ${message}`);
    }

    // Overlaps across factions are intentionally allowed (contested hexes):
    // do NOT add a uniqueness/coverage check here.
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

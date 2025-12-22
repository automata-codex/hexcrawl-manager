#!/usr/bin/env tsx
/**
 * Validate Faction ID References
 *
 * This script validates that all faction IDs referenced in encounters and clues
 * correspond to actual faction files in the data/factions directory.
 *
 * Usage:
 *   tsx scripts/validate-faction-ids.ts
 *   npm run validate:faction-ids
 */

import { resolveDataPath } from '@achm/data';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import yaml from 'yaml';

interface FactionData {
  id: string;
  name: string;
}

interface EncounterData {
  id: string;
  name: string;
  factions?: string[];
}

interface ClueData {
  id: string;
  name: string;
  factions?: string[];
}

interface ValidationIssue {
  file: string;
  itemId: string;
  itemName: string;
  invalidFactions: string[];
}

function loadYamlFile<T>(filePath: string): T | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return yaml.parse(content) as T;
  } catch {
    return null;
  }
}

function loadYamlFilesFromDir<T>(dir: string): T[] {
  if (!existsSync(dir)) {
    return [];
  }

  try {
    const files = readdirSync(dir).filter(
      (f) => f.endsWith('.yml') || f.endsWith('.yaml'),
    );
    const results: T[] = [];

    for (const file of files) {
      const data = loadYamlFile<T>(join(dir, file));
      if (data) {
        results.push(data);
      }
    }

    return results;
  } catch {
    return [];
  }
}

function getAllFactionIds(): Set<string> {
  const factionsDir = resolveDataPath('factions');
  const factions = loadYamlFilesFromDir<FactionData>(factionsDir);
  return new Set(factions.map((f) => f.id));
}

function validateEncounters(validFactionIds: Set<string>): ValidationIssue[] {
  const encountersDir = resolveDataPath('encounters');
  const issues: ValidationIssue[] = [];

  if (!existsSync(encountersDir)) {
    return issues;
  }

  const files = readdirSync(encountersDir).filter(
    (f) => f.endsWith('.yml') || f.endsWith('.yaml'),
  );

  for (const file of files) {
    const filePath = join(encountersDir, file);
    const encounter = loadYamlFile<EncounterData>(filePath);

    if (!encounter) continue;

    if (encounter.factions && encounter.factions.length > 0) {
      const invalidFactions = encounter.factions.filter(
        (f) => !validFactionIds.has(f),
      );

      if (invalidFactions.length > 0) {
        issues.push({
          file: `encounters/${file}`,
          itemId: encounter.id,
          itemName: encounter.name,
          invalidFactions,
        });
      }
    }
  }

  return issues;
}

function validateClues(validFactionIds: Set<string>): ValidationIssue[] {
  const cluesDir = resolveDataPath('clues');
  const issues: ValidationIssue[] = [];

  if (!existsSync(cluesDir)) {
    return issues;
  }

  const files = readdirSync(cluesDir).filter(
    (f) => f.endsWith('.yml') || f.endsWith('.yaml'),
  );

  for (const file of files) {
    const filePath = join(cluesDir, file);
    const clue = loadYamlFile<ClueData>(filePath);

    if (!clue) continue;

    if (clue.factions && clue.factions.length > 0) {
      const invalidFactions = clue.factions.filter(
        (f) => !validFactionIds.has(f),
      );

      if (invalidFactions.length > 0) {
        issues.push({
          file: `clues/${file}`,
          itemId: clue.id,
          itemName: clue.name,
          invalidFactions,
        });
      }
    }
  }

  return issues;
}

function main(): void {
  console.log('Validating faction ID references...\n');

  const validFactionIds = getAllFactionIds();

  if (validFactionIds.size === 0) {
    console.log('No factions found in data/factions directory.');
    console.log('Skipping faction ID validation.\n');
    process.exit(0);
  }

  console.log(`Found ${validFactionIds.size} faction(s): ${[...validFactionIds].join(', ')}\n`);

  const encounterIssues = validateEncounters(validFactionIds);
  const clueIssues = validateClues(validFactionIds);

  const allIssues = [...encounterIssues, ...clueIssues];

  if (allIssues.length === 0) {
    console.log('All faction ID references are valid.\n');
    process.exit(0);
  }

  console.error('Faction ID validation failed:\n');

  for (const issue of allIssues) {
    console.error(`  ${issue.file}`);
    console.error(`    ${issue.itemName} (${issue.itemId})`);
    console.error(`    Invalid faction(s): ${issue.invalidFactions.join(', ')}`);
    console.error('');
  }

  console.error(`Found ${allIssues.length} file(s) with invalid faction references.\n`);
  console.error(`Valid factions are: ${[...validFactionIds].join(', ')}\n`);
  process.exit(1);
}

main();

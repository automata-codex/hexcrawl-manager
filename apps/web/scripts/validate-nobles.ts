#!/usr/bin/env tsx
/**
 * Validate Nobles and Political Factions Cross-References
 *
 * This script validates that all cross-references between nobles and
 * political factions are valid:
 * - Noble `liege` references point to valid noble IDs
 * - Noble `factions` references point to valid faction IDs
 * - Faction `leadership` references point to valid noble IDs
 * - Faction `allies` references point to valid faction IDs
 *
 * Usage:
 *   tsx scripts/validate-nobles.ts
 *   npm run validate:nobles
 */

import { resolveDataPath } from '@skyreach/data';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'yaml';

const NOBLES_DIR = resolveDataPath('nobles');
const FACTIONS_DIR = resolveDataPath('political-factions');

interface NobleData {
  id: string;
  name: string;
  liege: string | null;
  factions?: string[];
}

interface FactionData {
  id: string;
  name: string;
  leadership?: string[];
  allies?: string[];
}

interface ValidationError {
  file: string;
  field: string;
  invalidRef: string;
  message: string;
}

function loadYamlFiles<T>(dir: string): { filename: string; data: T }[] {
  try {
    const files = readdirSync(dir).filter(
      (f) => f.endsWith('.yml') || f.endsWith('.yaml')
    );
    return files.map((file) => {
      const content = readFileSync(join(dir, file), 'utf-8');
      return { filename: file, data: yaml.parse(content) as T };
    });
  } catch {
    return [];
  }
}

function validate(): ValidationError[] {
  const nobles = loadYamlFiles<NobleData>(NOBLES_DIR);
  const factions = loadYamlFiles<FactionData>(FACTIONS_DIR);

  const nobleIds = new Set(nobles.map((n) => n.data.id));
  const factionIds = new Set(factions.map((f) => f.data.id));

  const errors: ValidationError[] = [];

  // Validate noble references
  for (const { filename, data: noble } of nobles) {
    // Check liege reference
    if (noble.liege !== null && !nobleIds.has(noble.liege)) {
      errors.push({
        file: `nobles/${filename}`,
        field: 'liege',
        invalidRef: noble.liege,
        message: `Noble "${noble.id}" references unknown liege "${noble.liege}"`,
      });
    }

    // Check faction references
    if (noble.factions) {
      for (const factionId of noble.factions) {
        if (!factionIds.has(factionId)) {
          errors.push({
            file: `nobles/${filename}`,
            field: 'factions',
            invalidRef: factionId,
            message: `Noble "${noble.id}" references unknown faction "${factionId}"`,
          });
        }
      }
    }
  }

  // Validate faction references
  for (const { filename, data: faction } of factions) {
    // Check leadership references
    if (faction.leadership) {
      for (const leaderId of faction.leadership) {
        if (!nobleIds.has(leaderId)) {
          errors.push({
            file: `political-factions/${filename}`,
            field: 'leadership',
            invalidRef: leaderId,
            message: `Faction "${faction.id}" references unknown leader "${leaderId}"`,
          });
        }
      }
    }

    // Check ally references
    if (faction.allies) {
      for (const allyId of faction.allies) {
        if (!factionIds.has(allyId)) {
          errors.push({
            file: `political-factions/${filename}`,
            field: 'allies',
            invalidRef: allyId,
            message: `Faction "${faction.id}" references unknown ally "${allyId}"`,
          });
        }
      }
    }
  }

  return errors;
}

function main() {
  console.log('Validating nobles and political factions...\n');

  const errors = validate();

  if (errors.length > 0) {
    console.error('Validation errors found:\n');

    for (const error of errors) {
      console.error(`  ${error.file}`);
      console.error(`    ${error.message}`);
      console.error('');
    }

    console.error(`Found ${errors.length} error(s)\n`);
    process.exit(1);
  }

  console.log('All noble and faction references are valid\n');
  process.exit(0);
}

main();

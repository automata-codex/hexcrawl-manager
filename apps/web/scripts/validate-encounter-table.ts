#!/usr/bin/env tsx
/**
 * Validate the default encounter table against its schema.
 *
 * This script validates:
 * - data/default-encounter-table.yaml against EncounterTableSchema
 *
 * Usage:
 *   tsx scripts/validate-encounter-table.ts
 *   npm run validate:encounter-table
 */

import { getDataPath } from '@achm/data';
import { EncounterTableSchema } from '@achm/schemas';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';

const DATA_DIR = getDataPath();

interface ValidationResult {
  file: string;
  valid: boolean;
  errors?: string[];
}

function validateEncounterTable(): ValidationResult {
  const filePath = path.join(DATA_DIR, 'default-encounter-table.yaml');

  if (!fs.existsSync(filePath)) {
    return {
      file: 'default-encounter-table.yaml',
      valid: false,
      errors: ['File not found'],
    };
  }

  const content = yaml.parse(fs.readFileSync(filePath, 'utf-8'));
  const result = EncounterTableSchema.safeParse(content);

  if (result.success) {
    return { file: 'default-encounter-table.yaml', valid: true };
  }

  return {
    file: 'default-encounter-table.yaml',
    valid: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    ),
  };
}

function main(): void {
  console.log('Validating encounter table...\n');

  const result = validateEncounterTable();

  if (result.valid) {
    console.log(`✅ ${result.file}`);
    console.log('\nEncounter table validated successfully!\n');
    process.exit(0);
  } else {
    console.error(`❌ ${result.file}`);
    for (const error of result.errors ?? []) {
      console.error(`   - ${error}`);
    }
    console.error('\nEncounter table validation failed!\n');
    process.exit(1);
  }
}

main();

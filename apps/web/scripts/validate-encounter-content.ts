#!/usr/bin/env tsx
/**
 * Validate Encounter Content Files
 *
 * This script validates that all encounters with a `contentPath` field reference
 * files that actually exist. It runs during the build process to fail fast if
 * content files are missing.
 *
 * Usage:
 *   tsx scripts/validate-encounter-content.ts
 *   npm run validate:encounters
 */

import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

// We can't use getCollection at build-script time, so we'll load YAML directly
import { readdirSync, readFileSync } from 'node:fs';
import yaml from 'yaml';
import type { EncounterData } from '@skyreach/schemas';

const ENCOUNTERS_DIR = resolve(process.cwd(), '../../data/encounters');

interface ValidationError {
  encounterId: string;
  contentPath: string;
  resolvedPath: string;
}

function loadEncounters(): EncounterData[] {
  const files = readdirSync(ENCOUNTERS_DIR).filter((file) =>
    file.endsWith('.yml') || file.endsWith('.yaml')
  );

  return files.map((file) => {
    const fullPath = join(ENCOUNTERS_DIR, file);
    const content = readFileSync(fullPath, 'utf-8');
    return yaml.parse(content) as EncounterData;
  });
}

function validateEncounterContent(): ValidationError[] {
  const encounters = loadEncounters();
  const errors: ValidationError[] = [];

  for (const encounter of encounters) {
    if (encounter.contentPath) {
      const resolvedPath = join(ENCOUNTERS_DIR, encounter.contentPath);

      if (!existsSync(resolvedPath)) {
        errors.push({
          encounterId: encounter.id,
          contentPath: encounter.contentPath,
          resolvedPath,
        });
      }
    }
  }

  return errors;
}

function main() {
  console.log('🔍 Validating encounter content files...');
  console.log(`   Encounters directory: ${ENCOUNTERS_DIR}\n`);

  const errors = validateEncounterContent();

  if (errors.length > 0) {
    console.error('❌ Encounter content validation failed:\n');
    errors.forEach((err) => {
      console.error(`  - Encounter "${err.encounterId}":`);
      console.error(`    Referenced: ${err.contentPath}`);
      console.error(`    Expected at: ${err.resolvedPath}`);
      console.error('');
    });
    console.error(`Found ${errors.length} missing content file(s)\n`);
    process.exit(1);
  }

  console.log('✅ All encounter content files validated successfully\n');
  process.exit(0);
}

main();

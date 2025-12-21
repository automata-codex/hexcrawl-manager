#!/usr/bin/env tsx
/**
 * Validate YAML configuration files against their schemas.
 *
 * This script validates:
 * - data/routes.yml against RoutesConfigSchema
 * - data/sidebar.yml against SidebarConfigSchema
 *
 * Usage:
 *   tsx scripts/validate-yaml-config.ts
 *   npm run validate:yaml-config
 */

import { getDataPath } from '@skyreach/data';
import {
  RoutesConfigSchema,
  SidebarConfigSchema,
} from '@skyreach/schemas';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const DATA_DIR = getDataPath();

interface ValidationResult {
  file: string;
  valid: boolean;
  errors?: string[];
}

function validateRoutesConfig(): ValidationResult {
  const filePath = path.join(DATA_DIR, 'routes.yml');

  if (!fs.existsSync(filePath)) {
    return {
      file: 'routes.yml',
      valid: false,
      errors: ['File not found'],
    };
  }

  const content = yaml.parse(fs.readFileSync(filePath, 'utf-8'));
  const result = RoutesConfigSchema.safeParse(content);

  if (result.success) {
    return { file: 'routes.yml', valid: true };
  }

  return {
    file: 'routes.yml',
    valid: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`
    ),
  };
}

function validateSidebarConfig(): ValidationResult {
  const filePath = path.join(DATA_DIR, 'sidebar.yml');

  if (!fs.existsSync(filePath)) {
    return {
      file: 'sidebar.yml',
      valid: false,
      errors: ['File not found'],
    };
  }

  const content = yaml.parse(fs.readFileSync(filePath, 'utf-8'));
  const result = SidebarConfigSchema.safeParse(content);

  if (result.success) {
    return { file: 'sidebar.yml', valid: true };
  }

  return {
    file: 'sidebar.yml',
    valid: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`
    ),
  };
}

function main(): void {
  console.log('Validating YAML configuration files...\n');

  const results = [
    validateRoutesConfig(),
    validateSidebarConfig(),
  ];

  let hasErrors = false;

  for (const result of results) {
    if (result.valid) {
      console.log(`✅ ${result.file}`);
    } else {
      hasErrors = true;
      console.error(`❌ ${result.file}`);
      for (const error of result.errors ?? []) {
        console.error(`   - ${error}`);
      }
    }
  }

  console.log();

  if (hasErrors) {
    console.error('YAML configuration validation failed!\n');
    process.exit(1);
  }

  console.log('YAML configuration validated successfully!\n');
  process.exit(0);
}

main();

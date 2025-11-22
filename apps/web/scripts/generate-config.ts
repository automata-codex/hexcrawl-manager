#!/usr/bin/env tsx
/**
 * Generate TypeScript configuration files from YAML sources.
 *
 * This script reads data/routes.yml and data/sidebar.yml and generates
 * TypeScript files that can be bundled for client-side use.
 *
 * Usage:
 *   tsx scripts/generate-config.ts
 *   npm run generate:config
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../../data');
const OUTPUT_DIR = path.resolve(__dirname, '../src/config/generated');

function generateRoutes(): void {
  const yamlPath = path.join(DATA_DIR, 'routes.yml');
  const content = yaml.parse(fs.readFileSync(yamlPath, 'utf-8'));

  // Generate TypeScript with the routes object
  const output = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated from data/routes.yml by scripts/generate-config.ts
 * Run "npm run generate:config" to regenerate.
 */

export const ROUTES = ${JSON.stringify(content, null, 2)} as const;

export function getDungeonPath(dungeonId: string): string {
  return interpolateRoute(ROUTES.gmReference.dungeons.id, { id: dungeonId });
}

export function getEncounterPath(encounterId: string): string {
  return interpolateRoute(ROUTES.gmReference.encounters.id, {
    id: encounterId,
  });
}

export function getFloatingCluePath(floatingClueId: string): string {
  return interpolateRoute(ROUTES.sessionToolkit.clues.floatingClues.id, {
    id: floatingClueId,
  });
}

export function getHexPath(hexId: string): string {
  return interpolateRoute(ROUTES.sessionToolkit.hexes.id, {
    id: hexId,
  }).toLowerCase();
}

export function getLootPackPath(lootPackId: string): string {
  return interpolateRoute(ROUTES.sessionToolkit.lootPacks.id, {
    id: lootPackId,
  });
}

export function getRegionPath(regionId: string): string {
  return interpolateRoute(ROUTES.sessionToolkit.regions.id, { id: regionId });
}

export function getRoleplayBookPath(roleplayBookId: string): string {
  return interpolateRoute(ROUTES.sessionToolkit.roleplayBooks.id, {
    id: roleplayBookId,
  });
}

export function getStatBlockPath(statBlockId: string): string {
  return interpolateRoute(ROUTES.gmReference.statBlocks.id, {
    id: statBlockId,
  });
}

export function interpolateRoute(
  route: string,
  params: Record<string, string>,
): string {
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(\`[\${key}]\`, value),
    route,
  );
}

// Note: Server-side path resolution helpers (getArticlePath, getCompositePath, resolvePath)
// are in src/utils/article-paths.ts since they require astro:content which is server-only.
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'routes.ts'), output);
  console.log('✅ Generated routes.ts');
}

function generateSidebarSections(): void {
  const yamlPath = path.join(DATA_DIR, 'sidebar.yml');
  const content = yaml.parse(fs.readFileSync(yamlPath, 'utf-8'));

  const output = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated from data/sidebar.yml by scripts/generate-config.ts
 * Run "npm run generate:config" to regenerate.
 */

import { canAccess } from '../../utils/auth.ts';
import { SCOPES } from '../../utils/constants.ts';

import type { SidebarSection } from '../../types.ts';

interface GetSidebarSectionsOptions {
  /**
   * When true, returns all sections regardless of role.
   * WARNING: This option is for build-time validation scripts only.
   * Do not use in production code - it bypasses access control.
   */
  includeAll?: boolean;
}

const shared: SidebarSection[] = ${JSON.stringify(content.shared, null, 2)};

const gmOnly: SidebarSection[] = ${JSON.stringify(content.gmOnly, null, 2)};

export function getSidebarSections(
  role: string | null,
  options: GetSidebarSectionsOptions = {},
): SidebarSection[] {
  // For build-time validation only - bypasses access control
  if (options.includeAll) return [...shared, ...gmOnly];

  if (canAccess(role, [SCOPES.GM])) return [...shared, ...gmOnly];
  if (canAccess(role, [SCOPES.PUBLIC, SCOPES.PLAYER])) return shared;
  return shared;
}
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'sidebar-sections.ts'), output);
  console.log('✅ Generated sidebar-sections.ts');
}

function main(): void {
  console.log('🔧 Generating TypeScript config from YAML...\n');

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  generateRoutes();
  generateSidebarSections();

  console.log('\n✨ Config generation complete!');
}

main();

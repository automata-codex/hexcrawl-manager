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

/**
 * Route type definitions
 */
export interface ArticleRoute {
  type: 'article';
  id: string;
}

export interface CompositeRoute {
  type: 'composite';
  id: string;
}

export interface CollectionRoute {
  type: 'collection';
  path: string;
  idPath: string;
  allPath?: string;
}

export type TypedRoute = ArticleRoute | CompositeRoute | CollectionRoute;

/**
 * Type guard to check if a value is a typed route object
 */
export function isTypedRoute(value: unknown): value is TypedRoute {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value.type === 'article' || value.type === 'composite' || value.type === 'collection')
  );
}

/**
 * Type guard for collection routes
 */
export function isCollectionRoute(value: unknown): value is CollectionRoute {
  return isTypedRoute(value) && value.type === 'collection';
}

/**
 * Interpolate a route template with parameters
 */
export function interpolateRoute(
  route: string,
  params: Record<string, string>,
): string {
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(\`[\${key}]\`, value),
    route,
  );
}

/**
 * Get the path for a collection item by its ID
 */
export function getCollectionItemPath(route: CollectionRoute, itemId: string): string {
  return interpolateRoute(route.idPath, { id: itemId });
}

// Collection path helpers
export function getDungeonPath(dungeonId: string): string {
  return getCollectionItemPath(ROUTES.gmReference.dungeons as CollectionRoute, dungeonId);
}

export function getEncounterPath(encounterId: string): string {
  return getCollectionItemPath(ROUTES.gmReference.encounters as CollectionRoute, encounterId);
}

export function getFloatingCluePath(floatingClueId: string): string {
  return getCollectionItemPath(ROUTES.sessionToolkit.clues.floatingClues as CollectionRoute, floatingClueId);
}

export function getHexPath(hexId: string): string {
  return getCollectionItemPath(ROUTES.sessionToolkit.hexes as CollectionRoute, hexId).toLowerCase();
}

export function getLootPackPath(lootPackId: string): string {
  return getCollectionItemPath(ROUTES.sessionToolkit.lootPacks as CollectionRoute, lootPackId);
}

export function getRegionPath(regionId: string): string {
  return getCollectionItemPath(ROUTES.sessionToolkit.regions as CollectionRoute, regionId);
}

export function getRoleplayBookPath(roleplayBookId: string): string {
  return getCollectionItemPath(ROUTES.sessionToolkit.roleplayBooks as CollectionRoute, roleplayBookId);
}

export function getRumorPath(rumorId: string): string {
  return getCollectionItemPath(ROUTES.sessionToolkit.rumors as CollectionRoute, rumorId);
}

export function getStatBlockPath(statBlockId: string): string {
  return getCollectionItemPath(ROUTES.gmReference.statBlocks as CollectionRoute, statBlockId);
}

export function getCharacterPath(characterId: string): string {
  return getCollectionItemPath(ROUTES.gmReference.characters as CollectionRoute, characterId);
}

export function getKnowledgeTreePath(treeId: string): string {
  return getCollectionItemPath(ROUTES.gmReference.knowledgeTrees as CollectionRoute, treeId);
}

export function getPointcrawlPath(pointcrawlSlug: string): string {
  return getCollectionItemPath(ROUTES.gmReference.pointcrawls as CollectionRoute, pointcrawlSlug);
}

export function getBountyPath(bountyId: string): string {
  return getCollectionItemPath(ROUTES.playersReference.setting.bountyBoard as CollectionRoute, bountyId);
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

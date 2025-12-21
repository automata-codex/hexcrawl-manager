/**
 * Migration script for encounter taxonomy fields.
 *
 * This script adds scope, locationTypes, and factions to existing encounters
 * based on inference from encounter content and usage patterns.
 *
 * Usage:
 *   npx tsx scripts/one-time-scripts/migrate-encounter-taxonomy.ts [--dry-run]
 *
 * Options:
 *   --dry-run    Show what would be changed without writing files
 */

import { getRepoPath } from '@achm/data';
import type {
  DungeonData,
  EncounterData,
  EncounterTableData,
  Faction,
  HexData,
  LocationType,
  RegionData,
} from '@achm/schemas';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';

// --- Configuration ---

const ENCOUNTERS_DIR = getRepoPath('data', 'encounters');
const DUNGEONS_DIR = getRepoPath('data', 'dungeons');
const HEXES_DIR = getRepoPath('data', 'hexes');
const REGIONS_DIR = getRepoPath('data', 'regions');

type EncounterScope = 'general' | 'hex' | 'region' | 'dungeon';
type Confidence = 'high' | 'medium' | 'low';

interface UsageLocation {
  type: 'hex' | 'region' | 'dungeon';
  id: string;
  name: string;
}

interface TaxonomyInference {
  scope: EncounterScope;
  locationTypes?: LocationType[];
  factions?: Faction[];
  confidence: Confidence;
  reasoning: string[];
}

interface MigrationDetail {
  id: string;
  filePath: string;
  changes: {
    scope: EncounterScope;
    locationTypes?: LocationType[];
    factions?: Faction[];
  };
  confidence: Confidence;
  reasoning: string[];
  usedIn: UsageLocation[];
}

interface MigrationReport {
  processed: number;
  modified: number;
  skipped: number;
  errors: string[];
  details: MigrationDetail[];
}

// --- Faction inference mappings ---

const FACTION_KEYWORDS: Array<{ keywords: string[]; faction: Faction }> = [
  { keywords: ['alseid'], faction: 'alseid' },
  { keywords: ['bearfolk', 'bear-folk', 'bear folk'], faction: 'bearfolk' },
  { keywords: ['beldrunn', 'vok'], faction: 'beldrunn-vok' },
  { keywords: ['blackthorn'], faction: 'blackthorns' },
  { keywords: ['flamehold', 'dwarf', 'dwarven', 'dwarves'], faction: 'flamehold-dwarves' },
  { keywords: ['kobold'], faction: 'kobolds' },
  { keywords: ['revenant', 'legion'], faction: 'revenant-legion' },
  { keywords: ['servitor'], faction: 'servitors' },
  { keywords: ['three dukes', 'three-dukes', 'duke'], faction: 'three-dukes' },
  { keywords: ['veil shepherd', 'veil-shepherd', 'shepherd'], faction: 'veil-shepherds' },
];

// --- Location type inference keywords ---

const WILDERNESS_KEYWORDS = [
  'wilderness',
  'forest',
  'patrol',
  'camp',
  'trail',
  'road',
  'hex',
  'hunt',
  'scouts',
  'caravan',
  'travelers',
  'outdoor',
  'prairie',
  'swamp',
  'marsh',
  'mountain',
  'river',
];

const DUNGEON_KEYWORDS = [
  'dungeon',
  'chamber',
  'room',
  'corridor',
  'crypt',
  'tomb',
  'underground',
  'cave',
  'lair',
  'vault',
  'ruin',
  'temple',
  'sanctum',
];

// --- IO helpers ---

async function readYamlFile<T = unknown>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf8');
  return yaml.parse(raw) as T;
}

/**
 * Appends new taxonomy fields to an existing YAML file without re-formatting.
 * This preserves the original file's formatting (line breaks, block scalars, etc.)
 */
async function appendTaxonomyFields(
  filePath: string,
  fields: { scope: string; locationTypes?: string[]; factions?: string[] },
): Promise<void> {
  let content = await fs.readFile(filePath, 'utf8');

  // Ensure file ends with newline
  if (!content.endsWith('\n')) {
    content += '\n';
  }

  // Append new fields
  content += `scope: ${fields.scope}\n`;

  if (fields.locationTypes && fields.locationTypes.length > 0) {
    content += `locationTypes:\n`;
    for (const lt of fields.locationTypes) {
      content += `  - ${lt}\n`;
    }
  }

  if (fields.factions && fields.factions.length > 0) {
    content += `factions:\n`;
    for (const f of fields.factions) {
      content += `  - ${f}\n`;
    }
  }

  await fs.writeFile(filePath, content, 'utf8');
}

async function listYamlFiles(dir: string, recursive = false): Promise<string[]> {
  try {
    const ents = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const e of ents) {
      const fullPath = path.join(dir, e.name);
      if (e.isFile() && (e.name.endsWith('.yml') || e.name.endsWith('.yaml'))) {
        files.push(fullPath);
      } else if (recursive && e.isDirectory() && !e.name.startsWith('.')) {
        const subFiles = await listYamlFiles(fullPath, true);
        files.push(...subFiles);
      }
    }

    return files;
  } catch {
    return [];
  }
}

async function listMdxFiles(dir: string, recursive = false): Promise<string[]> {
  try {
    const ents = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const e of ents) {
      const fullPath = path.join(dir, e.name);
      if (e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.mdx'))) {
        files.push(fullPath);
      } else if (recursive && e.isDirectory() && !e.name.startsWith('.')) {
        const subFiles = await listMdxFiles(fullPath, true);
        files.push(...subFiles);
      }
    }

    return files;
  } catch {
    return [];
  }
}

// --- Data loading ---

async function loadEncounters(): Promise<Map<string, { data: EncounterData; filePath: string }>> {
  const files = await listYamlFiles(ENCOUNTERS_DIR);
  const encounters = new Map<string, { data: EncounterData; filePath: string }>();

  for (const filePath of files) {
    const data = await readYamlFile<EncounterData>(filePath);
    if (data?.id) {
      encounters.set(data.id, { data, filePath });
    }
  }

  return encounters;
}

async function loadDungeons(): Promise<Array<{ id: string; data: DungeonData }>> {
  const files = await listMdxFiles(DUNGEONS_DIR, true); // recursive
  const dungeons: Array<{ id: string; data: DungeonData }> = [];

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8');
    // Extract frontmatter from MDX files
    const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const data = yaml.parse(frontmatterMatch[1]) as DungeonData;
      if (data?.id) {
        dungeons.push({ id: data.id, data });
      }
    }
  }

  return dungeons;
}

async function loadHexes(): Promise<Array<{ id: string; data: HexData }>> {
  const files = await listYamlFiles(HEXES_DIR, true); // recursive
  const hexes: Array<{ id: string; data: HexData }> = [];

  for (const filePath of files) {
    const data = await readYamlFile<HexData>(filePath);
    if (data?.id) {
      hexes.push({ id: data.id, data });
    }
  }

  return hexes;
}

async function loadRegions(): Promise<Array<{ id: string; data: RegionData }>> {
  const files = await listYamlFiles(REGIONS_DIR);
  const regions: Array<{ id: string; data: RegionData }> = [];

  for (const filePath of files) {
    const data = await readYamlFile<RegionData>(filePath);
    if (data?.id) {
      regions.push({ id: data.id, data });
    }
  }

  return regions;
}

// --- Usage tracking ---

function extractEncounterIdsFromRegion(regionData: RegionData): string[] {
  const encounterIds = new Set<string>();

  const encounters = regionData.encounters as EncounterTableData | undefined;
  if (encounters?.categoryTables) {
    for (const categoryTable of Object.values(encounters.categoryTables)) {
      for (const tierEntries of Object.values(categoryTable)) {
        for (const entry of tierEntries) {
          if (entry.encounterId) {
            encounterIds.add(entry.encounterId);
          }
        }
      }
    }
  }

  if (regionData.encounterIds) {
    for (const id of regionData.encounterIds) {
      encounterIds.add(id);
    }
  }

  return Array.from(encounterIds);
}

function buildUsageMap(
  dungeons: Array<{ id: string; data: DungeonData }>,
  hexes: Array<{ id: string; data: HexData }>,
  regions: Array<{ id: string; data: RegionData }>,
): Map<string, UsageLocation[]> {
  const usageMap = new Map<string, UsageLocation[]>();

  function addUsage(encounterId: string, location: UsageLocation): void {
    if (!usageMap.has(encounterId)) {
      usageMap.set(encounterId, []);
    }
    usageMap.get(encounterId)!.push(location);
  }

  // Scan dungeons
  for (const dungeon of dungeons) {
    const encounterIds = dungeon.data.encounters || [];
    for (const encounterId of encounterIds) {
      addUsage(encounterId, {
        type: 'dungeon',
        id: dungeon.data.id,
        name: dungeon.data.name,
      });
    }
  }

  // Scan hexes
  for (const hex of hexes) {
    const encounterIds = hex.data.encounters || [];
    for (const encounterId of encounterIds) {
      addUsage(encounterId, {
        type: 'hex',
        id: hex.data.id,
        name: hex.data.name,
      });
    }
  }

  // Scan regions
  for (const region of regions) {
    const encounterIds = extractEncounterIdsFromRegion(region.data);
    for (const encounterId of encounterIds) {
      addUsage(encounterId, {
        type: 'region',
        id: region.data.id,
        name: region.data.name,
      });
    }
  }

  return usageMap;
}

// --- Inference logic ---

function inferTaxonomy(
  encounter: EncounterData,
  usageLocations: UsageLocation[],
): TaxonomyInference {
  const reasoning: string[] = [];
  let confidence: Confidence = 'medium';

  // Build searchable text from encounter
  const text = `${encounter.id} ${encounter.name} ${encounter.description || ''}`.toLowerCase();

  // --- Infer scope based on usage ---
  let scope: EncounterScope = 'general';

  if (usageLocations.length === 0) {
    scope = 'general';
    confidence = 'low';
    reasoning.push('Not currently used anywhere, assuming general');
  } else if (usageLocations.length === 1) {
    const location = usageLocations[0];
    if (location.type === 'dungeon') {
      scope = 'dungeon';
      confidence = 'high';
      reasoning.push(`Only used in dungeon: ${location.name}`);
    } else if (location.type === 'hex') {
      scope = 'hex';
      confidence = 'high';
      reasoning.push(`Only used in hex: ${location.id}`);
    } else if (location.type === 'region') {
      scope = 'general';
      confidence = 'medium';
      reasoning.push('Used in region encounter table, likely general');
    }
  } else {
    // Used in multiple places
    const types = new Set(usageLocations.map((l) => l.type));
    if (types.has('region') || types.size > 1) {
      scope = 'general';
      confidence = 'high';
      reasoning.push(`Used in ${usageLocations.length} locations, likely general`);
    }
  }

  // --- Infer location types ---
  const locationTypes = new Set<LocationType>();

  const hasWildernessKeyword = WILDERNESS_KEYWORDS.some((kw) => text.includes(kw));
  const hasDungeonKeyword = DUNGEON_KEYWORDS.some((kw) => text.includes(kw));

  if (hasWildernessKeyword) {
    locationTypes.add('wilderness');
  }
  if (hasDungeonKeyword) {
    locationTypes.add('dungeon');
  }

  // If scope is dungeon, default to dungeon location type
  if (scope === 'dungeon' && locationTypes.size === 0) {
    locationTypes.add('dungeon');
    reasoning.push('Dungeon-scoped encounter defaults to dungeon location type');
  }

  // Default to wilderness for general encounters with no indicators
  if (locationTypes.size === 0 && scope === 'general') {
    locationTypes.add('wilderness');
    reasoning.push('No clear location indicators, defaulting to wilderness');
  }

  // --- Infer factions ---
  const factions = new Set<Faction>();

  for (const { keywords, faction } of FACTION_KEYWORDS) {
    if (keywords.some((kw) => text.includes(kw))) {
      factions.add(faction);
    }
  }

  if (factions.size > 0) {
    reasoning.push(`Detected factions: ${Array.from(factions).join(', ')}`);
  }

  return {
    scope,
    locationTypes: locationTypes.size > 0 ? Array.from(locationTypes).sort() : undefined,
    factions: factions.size > 0 ? (Array.from(factions).sort() as Faction[]) : undefined,
    confidence,
    reasoning,
  };
}

// --- Main migration ---

async function migrate(dryRun: boolean): Promise<MigrationReport> {
  const report: MigrationReport = {
    processed: 0,
    modified: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  console.log('Loading data...');
  const [encounters, dungeons, hexes, regions] = await Promise.all([
    loadEncounters(),
    loadDungeons(),
    loadHexes(),
    loadRegions(),
  ]);

  console.log(`Found ${encounters.size} encounters, ${dungeons.length} dungeons, ${hexes.length} hexes, ${regions.length} regions`);

  const usageMap = buildUsageMap(dungeons, hexes, regions);

  console.log('\nProcessing encounters...\n');

  for (const [encounterId, { data, filePath }] of encounters) {
    report.processed++;

    try {
      // Skip if already has scope (already migrated)
      if (data.scope) {
        report.skipped++;
        continue;
      }

      const usageLocations = usageMap.get(encounterId) || [];
      const inference = inferTaxonomy(data, usageLocations);

      // Build updated data
      const updatedData: Record<string, unknown> = { ...data };
      updatedData.scope = inference.scope;

      if (inference.locationTypes && inference.locationTypes.length > 0) {
        updatedData.locationTypes = inference.locationTypes;
      }

      if (inference.factions && inference.factions.length > 0) {
        updatedData.factions = inference.factions;
      }

      // Record the detail
      report.details.push({
        id: encounterId,
        filePath,
        changes: {
          scope: inference.scope,
          locationTypes: inference.locationTypes,
          factions: inference.factions,
        },
        confidence: inference.confidence,
        reasoning: inference.reasoning,
        usedIn: usageLocations,
      });

      // Write if not dry run
      if (!dryRun) {
        await appendTaxonomyFields(filePath, {
          scope: inference.scope,
          locationTypes: inference.locationTypes,
          factions: inference.factions,
        });
      }

      report.modified++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      report.errors.push(`${encounterId}: ${message}`);
    }
  }

  return report;
}

function printReport(report: MigrationReport, dryRun: boolean): void {
  console.log('\n' + '='.repeat(60));
  console.log(dryRun ? 'MIGRATION REPORT (DRY RUN)' : 'MIGRATION REPORT');
  console.log('='.repeat(60));

  console.log(`\nProcessed: ${report.processed}`);
  console.log(`Modified:  ${report.modified}`);
  console.log(`Skipped:   ${report.skipped} (already have scope)`);
  console.log(`Errors:    ${report.errors.length}`);

  if (report.errors.length > 0) {
    console.log('\nErrors:');
    for (const err of report.errors) {
      console.log(`  - ${err}`);
    }
  }

  // Group by confidence
  const byConfidence = {
    high: report.details.filter((d) => d.confidence === 'high'),
    medium: report.details.filter((d) => d.confidence === 'medium'),
    low: report.details.filter((d) => d.confidence === 'low'),
  };

  console.log('\nBy Confidence:');
  console.log(`  High:   ${byConfidence.high.length}`);
  console.log(`  Medium: ${byConfidence.medium.length}`);
  console.log(`  Low:    ${byConfidence.low.length}`);

  // Show low confidence cases for review
  if (byConfidence.low.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log('LOW CONFIDENCE CASES (Review Recommended)');
    console.log('-'.repeat(60));

    for (const detail of byConfidence.low) {
      console.log(`\n${detail.id}:`);
      console.log(`  Scope:          ${detail.changes.scope}`);
      console.log(`  Location Types: ${detail.changes.locationTypes?.join(', ') || '(none)'}`);
      console.log(`  Factions:       ${detail.changes.factions?.join(', ') || '(none)'}`);
      console.log(`  Reasoning:      ${detail.reasoning.join('; ')}`);
    }
  }

  // Summary by scope
  const byScope = {
    general: report.details.filter((d) => d.changes.scope === 'general'),
    hex: report.details.filter((d) => d.changes.scope === 'hex'),
    region: report.details.filter((d) => d.changes.scope === 'region'),
    dungeon: report.details.filter((d) => d.changes.scope === 'dungeon'),
  };

  console.log('\nBy Scope:');
  console.log(`  General: ${byScope.general.length}`);
  console.log(`  Hex:     ${byScope.hex.length}`);
  console.log(`  Region:  ${byScope.region.length}`);
  console.log(`  Dungeon: ${byScope.dungeon.length}`);

  // Count faction distribution
  const factionCounts = new Map<string, number>();
  for (const detail of report.details) {
    for (const faction of detail.changes.factions || []) {
      factionCounts.set(faction, (factionCounts.get(faction) || 0) + 1);
    }
  }

  if (factionCounts.size > 0) {
    console.log('\nFaction Distribution:');
    const sortedFactions = Array.from(factionCounts.entries()).sort((a, b) => b[1] - a[1]);
    for (const [faction, count] of sortedFactions) {
      console.log(`  ${faction}: ${count}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  if (dryRun) {
    console.log('DRY RUN - No files were modified');
    console.log('Run without --dry-run to apply changes');
  } else {
    console.log('Migration complete. Review low-confidence cases and adjust as needed.');
  }
  console.log('='.repeat(60));
}

// --- CLI entry point ---

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('Encounter Taxonomy Migration');
  console.log(dryRun ? 'Mode: DRY RUN (no files will be modified)\n' : 'Mode: LIVE (files will be modified)\n');

  const report = await migrate(dryRun);
  printReport(report, dryRun);

  if (report.errors.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

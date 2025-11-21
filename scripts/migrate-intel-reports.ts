#!/usr/bin/env tsx

/**
 * Migration script: Convert intelligence reports from linkPath to linkType/linkId
 *
 * This script reads all roleplay book YAML files and converts the legacy
 * linkText/linkPath fields to the new linkType/linkId format.
 *
 * Usage:
 *   npx tsx scripts/migrate-intel-reports.ts [--dry-run]
 *
 * Options:
 *   --dry-run  Show what would be changed without modifying files
 */

import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const ROLEPLAY_BOOKS_DIR = path.join(process.cwd(), 'data/roleplay-books');

interface LegacyIntelligenceReportRow {
  roll: number;
  report: string;
  linkText?: string;
  linkPath?: string;
  sampleDialogue: string;
  relevantConditions: string;
}

interface MigratedIntelligenceReportRow {
  roll: number;
  report: string;
  linkType?: string;
  linkId?: string;
  sampleDialogue: string;
  relevantConditions: string;
}

interface ParsedLink {
  linkType: string;
  linkId: string;
}

/**
 * Parse a linkPath to extract linkType and linkId
 */
function parseLinkPath(linkPath: string): ParsedLink | null {
  if (!linkPath) return null;

  // /gm-reference/encounters/{id} -> { linkType: 'encounter', linkId: '{id}' }
  const encounterMatch = linkPath.match(/\/gm-reference\/encounters\/(.+)/);
  if (encounterMatch) {
    return { linkType: 'encounter', linkId: encounterMatch[1] };
  }

  // /gm-reference/dungeons/{id} -> { linkType: 'dungeon', linkId: '{id}' }
  const dungeonMatch = linkPath.match(/\/gm-reference\/dungeons\/(.+)/);
  if (dungeonMatch) {
    return { linkType: 'dungeon', linkId: dungeonMatch[1] };
  }

  // /session-toolkit/clues/floating-clues/{id} -> { linkType: 'clue', linkId: '{id}' }
  const clueMatch = linkPath.match(/\/session-toolkit\/clues\/floating-clues\/(.+)/);
  if (clueMatch) {
    return { linkType: 'clue', linkId: clueMatch[1] };
  }

  // /session-toolkit/hexes/{id} -> { linkType: 'hex', linkId: '{id}' }
  const hexMatch = linkPath.match(/\/session-toolkit\/hexes\/(.+)/);
  if (hexMatch) {
    return { linkType: 'hex', linkId: hexMatch[1] };
  }

  // /session-toolkit/regions/{id} -> { linkType: 'region', linkId: '{id}' }
  const regionMatch = linkPath.match(/\/session-toolkit\/regions\/(.+)/);
  if (regionMatch) {
    return { linkType: 'region', linkId: regionMatch[1] };
  }

  // /gm-reference/factions/{id} -> { linkType: 'faction', linkId: '{id}' }
  const factionMatch = linkPath.match(/\/gm-reference\/factions\/(.+)/);
  if (factionMatch) {
    return { linkType: 'faction', linkId: factionMatch[1] };
  }

  // /gm-reference/knowledge-trees/{id} -> { linkType: 'knowledge-node', linkId: '{id}' }
  const knowledgeMatch = linkPath.match(/\/gm-reference\/knowledge-trees\/(.+)/);
  if (knowledgeMatch) {
    return { linkType: 'knowledge-node', linkId: knowledgeMatch[1] };
  }

  return null;
}

/**
 * Migrate a single intelligence report row
 */
function migrateRow(
  row: LegacyIntelligenceReportRow,
  bookName: string,
): { migrated: MigratedIntelligenceReportRow; warning?: string } {
  const { linkText, linkPath, ...rest } = row;

  // If no linkPath, just return without link fields
  if (!linkPath) {
    return { migrated: rest };
  }

  // Parse the linkPath
  const parsed = parseLinkPath(linkPath);

  if (!parsed) {
    // Could not parse - return without link fields and warn
    return {
      migrated: rest,
      warning: `Could not parse linkPath "${linkPath}" in ${bookName}, roll ${row.roll}`,
    };
  }

  return {
    migrated: {
      ...rest,
      linkType: parsed.linkType,
      linkId: parsed.linkId,
    },
  };
}

/**
 * Process a single roleplay book file
 */
function processFile(
  filePath: string,
  dryRun: boolean,
): { modified: boolean; warnings: string[] } {
  const fileName = path.basename(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Parse YAML with options to preserve formatting
  const doc = yaml.parseDocument(content);
  const data = doc.toJS();

  if (!data.intelligenceReports?.rows) {
    return { modified: false, warnings: [] };
  }

  const warnings: string[] = [];
  let modified = false;

  // Process each row
  const migratedRows: MigratedIntelligenceReportRow[] = [];
  for (const row of data.intelligenceReports.rows as LegacyIntelligenceReportRow[]) {
    const { migrated, warning } = migrateRow(row, fileName);
    migratedRows.push(migrated);

    if (warning) {
      warnings.push(warning);
    }

    // Check if this row was actually changed
    if (row.linkPath || row.linkText) {
      modified = true;
    }
  }

  if (modified) {
    // Update the rows in the data
    data.intelligenceReports.rows = migratedRows;

    if (!dryRun) {
      // Write back to file
      const newContent = yaml.stringify(data, {
        lineWidth: 80,
        defaultKeyType: 'PLAIN',
        defaultStringType: 'PLAIN',
      });
      fs.writeFileSync(filePath, newContent, 'utf-8');
    }
  }

  return { modified, warnings };
}

/**
 * Main function
 */
function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('Migration: Intelligence Reports (linkPath -> linkType/linkId)');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log('');

  // Find all roleplay book files
  const files = fs.readdirSync(ROLEPLAY_BOOKS_DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));

  console.log(`Found ${files.length} roleplay book files:\n`);

  let totalModified = 0;
  const allWarnings: string[] = [];

  for (const file of files) {
    const filePath = path.join(ROLEPLAY_BOOKS_DIR, file);
    const { modified, warnings } = processFile(filePath, dryRun);

    const status = modified ? 'MODIFIED' : 'unchanged';
    console.log(`  ${file}: ${status}`);

    if (modified) {
      totalModified++;
    }

    allWarnings.push(...warnings);
  }

  console.log('');
  console.log(`Summary: ${totalModified} files ${dryRun ? 'would be ' : ''}modified`);

  if (allWarnings.length > 0) {
    console.log('');
    console.log('Warnings:');
    for (const warning of allWarnings) {
      console.log(`  - ${warning}`);
    }
  }

  if (dryRun && totalModified > 0) {
    console.log('');
    console.log('Run without --dry-run to apply changes.');
  }
}

main();

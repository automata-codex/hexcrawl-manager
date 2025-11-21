#!/usr/bin/env tsx
/**
 * Validate Dungeon Encounter References
 *
 * This script validates that encounters listed in dungeon frontmatter match
 * the encounter links used in the MDX content (via getEncounterPath calls).
 *
 * It checks bidirectionally:
 * - All frontmatter encounters should be linked in content
 * - All content links should be listed in frontmatter
 *
 * Usage:
 *   tsx scripts/validate-dungeon-encounters.ts
 *   npm run validate:dungeon-encounters
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import yaml from 'yaml';

const DUNGEONS_DIR = resolve(process.cwd(), '../../data/dungeons');

interface DungeonFrontmatter {
  id: string;
  name: string;
  encounters?: string[];
}

interface ValidationIssue {
  dungeonId: string;
  dungeonName: string;
  filePath: string;
  inFrontmatterOnly: string[];
  inContentOnly: string[];
}

/**
 * Recursively find all MDX files in a directory
 */
function findMdxFiles(dir: string): string[] {
  const files: string[] = [];

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findMdxFiles(fullPath));
    } else if (entry.endsWith('.mdx')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Parse frontmatter from MDX content
 */
function parseFrontmatter(content: string): DungeonFrontmatter | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  try {
    return yaml.parse(frontmatterMatch[1]) as DungeonFrontmatter;
  } catch {
    return null;
  }
}

/**
 * Extract encounter IDs from getEncounterPath calls in content
 */
function extractEncounterPathCalls(content: string): string[] {
  const encounterIds = new Set<string>();

  // Match getEncounterPath('encounter-id') or getEncounterPath("encounter-id")
  const regex = /getEncounterPath\(['"]([^'"]+)['"]\)/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    encounterIds.add(match[1]);
  }

  return Array.from(encounterIds);
}

/**
 * Validate a single dungeon file
 */
function validateDungeon(filePath: string): ValidationIssue | null {
  const content = readFileSync(filePath, 'utf-8');
  const frontmatter = parseFrontmatter(content);

  if (!frontmatter) {
    console.warn(`  Warning: Could not parse frontmatter in ${filePath}`);
    return null;
  }

  const frontmatterEncounters = new Set(frontmatter.encounters || []);
  const contentEncounters = new Set(extractEncounterPathCalls(content));

  // Skip dungeons with no encounters defined anywhere
  if (frontmatterEncounters.size === 0 && contentEncounters.size === 0) {
    return null;
  }

  // Find mismatches
  const inFrontmatterOnly = [...frontmatterEncounters].filter(
    (id) => !contentEncounters.has(id),
  );
  const inContentOnly = [...contentEncounters].filter(
    (id) => !frontmatterEncounters.has(id),
  );

  if (inFrontmatterOnly.length === 0 && inContentOnly.length === 0) {
    return null;
  }

  return {
    dungeonId: frontmatter.id,
    dungeonName: frontmatter.name,
    filePath,
    inFrontmatterOnly,
    inContentOnly,
  };
}

/**
 * Main validation function
 */
function validateDungeonEncounters(): ValidationIssue[] {
  const mdxFiles = findMdxFiles(DUNGEONS_DIR);
  const issues: ValidationIssue[] = [];

  for (const filePath of mdxFiles) {
    const issue = validateDungeon(filePath);
    if (issue) {
      issues.push(issue);
    }
  }

  return issues;
}

function main() {
  console.log('Validating dungeon encounter references...');
  console.log(`   Dungeons directory: ${DUNGEONS_DIR}\n`);

  const issues = validateDungeonEncounters();

  if (issues.length > 0) {
    console.error('Dungeon encounter validation found mismatches:\n');

    for (const issue of issues) {
      console.error(`  ${issue.dungeonName} (${issue.dungeonId})`);
      console.error(`    File: ${issue.filePath}`);

      if (issue.inFrontmatterOnly.length > 0) {
        console.error(
          `    In frontmatter but not linked in content:`,
        );
        for (const id of issue.inFrontmatterOnly) {
          console.error(`      - ${id}`);
        }
      }

      if (issue.inContentOnly.length > 0) {
        console.error(
          `    Linked in content but not in frontmatter:`,
        );
        for (const id of issue.inContentOnly) {
          console.error(`      - ${id}`);
        }
      }
      console.error('');
    }

    console.error(`Found ${issues.length} dungeon(s) with mismatched encounters\n`);
    process.exit(1);
  }

  console.log('All dungeon encounter references validated successfully\n');
  process.exit(0);
}

main();

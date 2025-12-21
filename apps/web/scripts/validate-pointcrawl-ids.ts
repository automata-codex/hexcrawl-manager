#!/usr/bin/env tsx
/**
 * Validate Pointcrawl Node/Edge ID Uniqueness
 *
 * This script validates that all nodes and edges within a given pointcrawl
 * have unique IDs across both collections. This is required for URL routing
 * to work correctly.
 *
 * Usage:
 *   tsx scripts/validate-pointcrawl-ids.ts
 *   npm run validate:pointcrawls
 */

import { resolveDataPath } from '@achm/data';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'yaml';

const POINTCRAWLS_DIR = resolveDataPath('pointcrawls');
const NODES_DIR = resolveDataPath('pointcrawl-nodes');
const EDGES_DIR = resolveDataPath('pointcrawl-edges');

interface PointcrawlData {
  id: string;
  name: string;
}

interface NodeData {
  id: string;
  pointcrawlId: string;
  label: string;
  name: string;
}

interface EdgeData {
  id: string;
  pointcrawlId: string;
  label: string;
}

interface ValidationIssue {
  pointcrawlId: string;
  pointcrawlName: string;
  duplicateId: string;
  locations: string[]; // e.g., ["node: The Engine Room", "edge: 1.A"]
}

function loadYamlFiles<T>(dir: string): T[] {
  try {
    const files = readdirSync(dir).filter(
      (f) => f.endsWith('.yml') || f.endsWith('.yaml')
    );
    return files.map((file) => {
      const content = readFileSync(join(dir, file), 'utf-8');
      return yaml.parse(content) as T;
    });
  } catch {
    return [];
  }
}

function parseFrontmatter<T>(content: string): T | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  try {
    return yaml.parse(match[1]) as T;
  } catch {
    return null;
  }
}

function loadMdxFiles<T>(dir: string): T[] {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    const results: T[] = [];

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Recurse into subdirectories
        results.push(...loadMdxFiles<T>(fullPath));
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
        const content = readFileSync(fullPath, 'utf-8');
        const data = parseFrontmatter<T>(content);
        if (data) results.push(data);
      }
    }
    return results;
  } catch {
    return [];
  }
}

function validatePointcrawlIds(): ValidationIssue[] {
  const pointcrawls = loadYamlFiles<PointcrawlData>(POINTCRAWLS_DIR);
  const nodes = loadMdxFiles<NodeData>(NODES_DIR);
  const edges = loadMdxFiles<EdgeData>(EDGES_DIR);

  const issues: ValidationIssue[] = [];

  for (const pointcrawl of pointcrawls) {
    const pcNodes = nodes.filter((n) => n.pointcrawlId === pointcrawl.id);
    const pcEdges = edges.filter((e) => e.pointcrawlId === pointcrawl.id);

    // Build map of ID -> locations
    const idMap = new Map<string, string[]>();

    for (const node of pcNodes) {
      const locations = idMap.get(node.id) || [];
      locations.push(`node: ${node.label} "${node.name}"`);
      idMap.set(node.id, locations);
    }

    for (const edge of pcEdges) {
      const locations = idMap.get(edge.id) || [];
      locations.push(`edge: ${edge.label}`);
      idMap.set(edge.id, locations);
    }

    // Find duplicates
    for (const [id, locations] of idMap) {
      if (locations.length > 1) {
        issues.push({
          pointcrawlId: pointcrawl.id,
          pointcrawlName: pointcrawl.name,
          duplicateId: id,
          locations,
        });
      }
    }
  }

  return issues;
}

function main() {
  console.log('Validating pointcrawl node/edge ID uniqueness...\n');

  const issues = validatePointcrawlIds();

  if (issues.length > 0) {
    console.error('Pointcrawl ID validation failed:\n');

    for (const issue of issues) {
      console.error(`  ${issue.pointcrawlName} (${issue.pointcrawlId})`);
      console.error(`    Duplicate ID: "${issue.duplicateId}"`);
      console.error(`    Found in:`);
      for (const loc of issue.locations) {
        console.error(`      - ${loc}`);
      }
      console.error('');
    }

    console.error(`Found ${issues.length} duplicate ID(s)\n`);
    process.exit(1);
  }

  console.log('All pointcrawl IDs are unique within their pointcrawls\n');
  process.exit(0);
}

main();

# Pointcrawl Pages Specification

## Overview

Implement display pages for pointcrawl data within the GM Reference section. Pointcrawls represent graph-based navigation systems (like ship decks or dungeon complexes) with nodes (locations) connected by edges (paths).

## Routes

| Path                                 | Purpose                  |
|--------------------------------------|--------------------------|
| `gm-reference/pointcrawls`           | List all pointcrawls     |
| `gm-reference/pointcrawls/[id]`      | Pointcrawl detail page   |
| `gm-reference/pointcrawls/[id]/[id]` | Node or edge detail page |

All pages use `SecretLayout` (GM-only content).

## Schema Change Required

Add `isEntry` field to `PointcrawlNodeSchema` in `packages/schemas/src/schemas/pointcrawl-node.ts`:

```typescript
isEntry: z
  .boolean()
  .optional()
  .describe('Whether this node is an entry point accessible from outside the pointcrawl'),
```

## Page 1: Pointcrawl List (`gm-reference/pointcrawls/index.astro`)

### Data Requirements

- Fetch all entries from `pointcrawls` collection

### Display

- Page title: "Pointcrawls"
- List each pointcrawl as a link showing:
  - Name
  - Summary (if present)
  - Hex IDs where accessible (as links to `/session-toolkit/hexes/[id]`)

## Page 2: Pointcrawl Detail (`gm-reference/pointcrawls/[id].astro`)

### Data Requirements

- Fetch pointcrawl by ID from `pointcrawls` collection
- Fetch all nodes from `pointcrawl-nodes` collection where `pointcrawlId` matches
- Fetch all edges from `pointcrawl-edges` collection where `pointcrawlId` matches

### Layout (top to bottom)

1. **Page title**: Pointcrawl name
2. **Map image**: Display first image from `images` array (if present), similar to dungeon page layout
3. **Summary**: Render summary text if present
4. **Hex access**: List of hex IDs where this pointcrawl is accessible, as links to `/session-toolkit/hexes/[id]`
5. **Builders**: Display builder tags if present (use existing badge styling)
6. **Random encounters**: Use `RandomEncounterTable` component if `encounters` field is populated
7. **Entry points section**:
   - Header: "Entry Points"
   - List nodes where `isEntry: true`
   - Each entry shows: label, name, link to node detail page
8. **All nodes accordion**:
  - Single expandable section (use existing accordion pattern from `SideNav.svelte`)
  - Header: "All Nodes"
  - Group nodes by `level` field if multiple levels exist
  - If all nodes have the same level or no level, display as a flat list
  - Each node shows: label, name, link to detail page

## Page 3: Node/Edge Detail (`gm-reference/pointcrawls/[id]/[id].astro`)

### Routing Logic

The second `[id]` parameter can be either a node ID or edge ID. To disambiguate:

1. Look up in `pointcrawl-nodes` collection where `id` matches AND `pointcrawlId` matches parent
2. If not found, look up in `pointcrawl-edges` collection with same criteria
3. If neither found, return 404

Node and edge IDs are guaranteed unique within a pointcrawl across both collections.

### Node Detail Display

1. **Page title**: `{label}: {name}`
2. **Level**: Display level number if present
3. **Entry point badge**: If `isEntry: true`, show badge/indicator
4. **Markdown content**: Render full MDX body from the node's content file
5. **Set encounters**: If `encounters` array populated, list linked encounters (guaranteed to occur)
6. **Random encounters**: Use `RandomEncounterTable` component if `encounterOverrides` present, inheriting from parent pointcrawl's encounter table
7. **Treasure**: Display treasure items if present (use existing treasure display patterns)
8. **Knowledge unlocks**: Use `Unlocks.svelte` component if `unlocks` array present
9. **Connected edges section**:
  - Header: "Connections"
  - For each edge connected to this node, show:
    - Edge label (as link to edge detail)
    - "to" or "from" indicator
    - Connected node's label and name (as link to node detail)
  - Example: "Edge 1.A → Node 2: The Engine Room"

### Edge Detail Display

1. **Page title**: `Edge {label}`
2. **Markdown content**: Render full MDX body from the edge's content file
3. **Traversal time**: Display in prose format
   - Symmetric (single segment): "30 minutes"
   - Asymmetric (tuple): "30 minutes going down, 45 minutes going up"
   - Include direction words when present in data
4. **Connected nodes section**:
   - Header: "Connects"
   - Show both endpoints:
     - "From: {fromNode.label}: {fromNode.name}" (as link)
     - "To: {toNode.label}: {toNode.name}" (as link)
   - Include level info if nodes are on different levels
5. **Set encounters**: If `encounters` array populated, list linked encounters
6. **Random encounters**: Use `RandomEncounterTable` component if `encounterOverrides` present

## Traversal Time Formatting

Create a utility function to format traversal time:

```typescript
// In apps/web/src/utils/pointcrawl.ts

import type { TraversalTimeData, TraversalSegmentData } from '@skyreach/schemas';

function formatSegment(segment: TraversalSegmentData): string {
  const time = `${segment.count} ${segment.unit}`;
  if (segment.direction) {
    return `${time} going ${segment.direction}`;
  }
  return time;
}

export function formatTraversalTime(time: TraversalTimeData): string {
  if (Array.isArray(time) && time.length === 2) {
    // Asymmetric: tuple of two segments
    return `${formatSegment(time[0])}, ${formatSegment(time[1])}`;
  }
  // Symmetric: single segment
  return formatSegment(time as TraversalSegmentData);
}
```

## Component Reuse

| Component                               | Usage                                                        |
|-----------------------------------------|--------------------------------------------------------------|
| `SecretLayout`                          | Page wrapper for all three pages                             |
| `RandomEncounterTable`                  | Display encounter tables on pointcrawl, node, and edge pages |
| `Unlocks.svelte`                        | Display knowledge unlocks on node pages                      |
| Accordion pattern from `SideNav.svelte` | "All Nodes" expandable section                               |

## File Structure

```
apps/web/src/pages/gm-reference/pointcrawls/
├── index.astro                 # List page
├── [id].astro                  # Pointcrawl detail
└── [id]/
    └── [nodeOrEdgeId].astro    # Node/edge detail

apps/web/scripts/
└── validate-pointcrawl-ids.ts  # ID uniqueness validation

apps/web/src/utils/
└── pointcrawl.ts               # Traversal time formatting utility
```

## Implementation Order

1. Update `PointcrawlNodeSchema` to add `isEntry` field
2. Create utility function for traversal time formatting
3. Create validation script (`validate-pointcrawl-ids.ts`) and add npm script
4. Implement list page (`index.astro`)
5. Implement pointcrawl detail page (`[id].astro`)
6. Implement node/edge detail page (`[id]/[nodeOrEdgeId].astro`)
7. Add pointcrawl links to hex detail pages

## Validation Script

Create `apps/web/scripts/validate-pointcrawl-ids.ts` to ensure node and edge IDs are unique within each pointcrawl.

### Purpose

Node and edge IDs must be unique across both collections within a given pointcrawl. This is required for the `[id]/[id]` route disambiguation to work correctly.

### Implementation

```typescript
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

import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import yaml from 'yaml';

const DATA_DIR = resolve(process.cwd(), '../../data');
const POINTCRAWLS_DIR = join(DATA_DIR, 'pointcrawls');
const NODES_DIR = join(DATA_DIR, 'pointcrawl-nodes');
const EDGES_DIR = join(DATA_DIR, 'pointcrawl-edges');

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
  const files = readdirSync(dir).filter(
    (f) => f.endsWith('.yml') || f.endsWith('.yaml')
  );
  return files.map((file) => {
    const content = readFileSync(join(dir, file), 'utf-8');
    return yaml.parse(content) as T;
  });
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
  const files = readdirSync(dir, { recursive: true })
    .filter((f) => typeof f === 'string' && (f.endsWith('.md') || f.endsWith('.mdx')));

  const results: T[] = [];
  for (const file of files) {
    const content = readFileSync(join(dir, file as string), 'utf-8');
    const data = parseFrontmatter<T>(content);
    if (data) results.push(data);
  }
  return results;
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
  console.log('🔍 Validating pointcrawl node/edge ID uniqueness...\n');

  const issues = validatePointcrawlIds();

  if (issues.length > 0) {
    console.error('❌ Pointcrawl ID validation failed:\n');

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

  console.log('✅ All pointcrawl IDs are unique within their pointcrawls\n');
  process.exit(0);
}

main();
```

### npm Script

Add to `apps/web/package.json`:

```json
{
  "scripts": {
    "validate:pointcrawls": "tsx scripts/validate-pointcrawl-ids.ts"
  }
}
```

### When to Run

- During CI/build process
- Before deploying changes to pointcrawl data
- Can be added to the weekly release checklist

## Edge Cases

- **No entry points**: Display "No entry points defined" in entry points section
- **Single-level pointcrawl**: Don't show level groupings in accordion, just flat list
- **Missing connected node/edge**: Log warning but don't crash; show "Unknown" placeholder
- **No images**: Skip map image section entirely
- **Empty encounters**: Don't render `RandomEncounterTable` component

## Hex Page Integration

Add a "Pointcrawls" section to hex detail pages that displays any pointcrawls accessible from that hex.

### Implementation

On the hex detail page (likely in `GmHexDetails.svelte` or similar):

1. Query all pointcrawls from the `pointcrawls` collection
2. Filter to those where `hexIds` array includes the current hex ID
3. If any matches, display a "Pointcrawls" section with links to each pointcrawl detail page

### Display

```
## Pointcrawls

- [Skyspire Base Station](/gm-reference/pointcrawls/skyspire-base)
```

### Notes

- Only show the section if there are matching pointcrawls
- This creates a bidirectional navigation: hex → pointcrawl and pointcrawl → hex

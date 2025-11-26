# Pointcrawl Components Implementation Plan

**Spec:** `docs/specs/pointcrawl-components.md`
**Branch:** `pointcrawl-components`
**Created:** 2025-11-26

## Overview

Implement display pages for pointcrawl data within the GM Reference section. This plan is divided into phases with manual review/commit points between each.

---

## Phase 1: Schema Changes

### Tasks

1. **Add `isEntry` field to PointcrawlNodeSchema**
   - File: `packages/schemas/src/schemas/pointcrawl-node.ts`
   - Add after `level` field:
     ```typescript
     isEntry: z
       .boolean()
       .optional()
       .describe('Whether this node is an entry point accessible from outside the pointcrawl'),
     ```

2. **Verify type exports from schemas package**
   - Ensure `TraversalSegmentData` and `TraversalTimeData` are exported from barrel
   - File: `packages/schemas/src/index.ts`

3. **Regenerate JSON schemas**
   ```bash
   npm run build:json-schemas
   ```

4. **Run typecheck**
   ```bash
   npm run typecheck
   ```

### Deliverables
- Updated `PointcrawlNodeSchema` with `isEntry` field
- Verified type exports
- Regenerated JSON schemas
- Clean typecheck

### Commit Point
Commit message: "Add isEntry field to PointcrawlNodeSchema"

---

## Phase 2: Skyspire Test Data

### Prerequisites
- Add Skyspire base station map PNG(s) to `public/images/maps/pointcrawls/`

### Tasks

1. **Create pointcrawl data directory structure**
   ```
   data/pointcrawls/
   data/pointcrawl-nodes/skyspire-base/
   data/pointcrawl-edges/skyspire-base/
   ```

2. **Create main pointcrawl file**
   - File: `data/pointcrawls/skyspire-base.yml`
   - Include: id, slug, name, hexIds, images, summary
   - Reference the map image(s)

3. **Create initial node files**
   - Files: `data/pointcrawl-nodes/skyspire-base/*.mdx`
   - Based on map labels, create nodes with:
     - Frontmatter: id, pointcrawlId, label, name, level, isEntry (for entry points)
     - MDX content: placeholder or real descriptions
   - Ensure at least one node has `isEntry: true`

4. **Create initial edge files**
   - Files: `data/pointcrawl-edges/skyspire-base/*.mdx`
   - Based on map connections, create edges with:
     - Frontmatter: id, pointcrawlId, label, from, fromLevel, to, toLevel, traversalTime
     - MDX content: placeholder or real descriptions

5. **Verify Astro can load the collections**
   ```bash
   npx astro sync
   ```

### Deliverables
- Skyspire base pointcrawl YAML file
- Initial node MDX files (derived from map)
- Initial edge MDX files (derived from map)
- Astro sync passes

### Commit Point
Commit message: "Add Skyspire base station pointcrawl data"

---

## Phase 3: Utility Functions & Validation Script

### Tasks

1. **Create traversal time utility**
   - File: `apps/web/src/utils/pointcrawl.ts`
   - Implement `formatTraversalTime()` function per spec
   - Import types from `@skyreach/schemas`

2. **Create validation script**
   - File: `apps/web/scripts/validate-pointcrawl-ids.ts`
   - Validate node/edge ID uniqueness within each pointcrawl
   - Implementation provided in spec

3. **Add npm script**
   - File: `apps/web/package.json`
   - Add: `"validate:pointcrawls": "tsx scripts/validate-pointcrawl-ids.ts"`

4. **Run validation**
   ```bash
   cd apps/web && npm run validate:pointcrawls
   ```

### Deliverables
- `apps/web/src/utils/pointcrawl.ts` with formatting utility
- `apps/web/scripts/validate-pointcrawl-ids.ts` validation script
- npm script added
- Validation passes on test data

### Commit Point
Commit message: "Add pointcrawl utility functions and validation script"

---

## Phase 4: List Page

### Tasks

1. **Create list page**
   - File: `apps/web/src/pages/gm-reference/pointcrawls/index.astro`
   - Use `SecretLayout` wrapper
   - Fetch all entries from `pointcrawls` collection
   - Display each pointcrawl with:
     - Name (as link to detail page)
     - Summary (if present)
     - Hex IDs (as links to `/session-toolkit/hexes/[id]`)

2. **Test with dev server**
   ```bash
   npm run dev
   # Visit http://localhost:4321/gm-reference/pointcrawls
   ```

### Deliverables
- Working list page at `/gm-reference/pointcrawls`
- Shows Skyspire base station entry

### Commit Point
Commit message: "Add pointcrawl list page"

---

## Phase 5: Pointcrawl Detail Page

### Tasks

1. **Create detail page**
   - File: `apps/web/src/pages/gm-reference/pointcrawls/[id].astro`
   - Use `SecretLayout` wrapper
   - Fetch pointcrawl by ID
   - Fetch related nodes and edges by `pointcrawlId`

2. **Implement layout sections (top to bottom)**
   - Page title: pointcrawl name
   - Map image: first image from `images` array (if present)
   - Summary: render if present
   - Hex access: links to hex pages
   - Builders: badge display (if present)
   - Random encounters: `RandomEncounterTable` component (if `encounters` populated)
   - Entry points section: nodes with `isEntry: true`
   - All nodes accordion: expandable section, grouped by level if multiple levels exist

3. **Test with dev server**
   ```bash
   npm run dev
   # Visit http://localhost:4321/gm-reference/pointcrawls/skyspire-base
   ```

### Deliverables
- Working detail page at `/gm-reference/pointcrawls/[id]`
- All sections rendering correctly

### Commit Point
Commit message: "Add pointcrawl detail page"

---

## Phase 6: Node/Edge Detail Page

### Tasks

1. **Create detail page with route disambiguation**
   - File: `apps/web/src/pages/gm-reference/pointcrawls/[id]/[nodeOrEdgeId].astro`
   - Use `SecretLayout` wrapper
   - Fetch parent pointcrawl by first `[id]`
   - Look up second `[id]` in nodes collection first, then edges
   - Return 404 if neither found

2. **Implement node display**
   - Page title: `{label}: {name}`
   - Level number (if present)
   - Entry point badge (if `isEntry: true`)
   - MDX content body
   - Set encounters (if `encounters` array populated)
   - Random encounters (`RandomEncounterTable` if `encounterOverrides` present)
   - Treasure (if present)
   - Knowledge unlocks (`Unlocks.svelte` if `unlocks` present)
   - Connected edges section with links

3. **Implement edge display**
   - Page title: `Edge {label}`
   - MDX content body
   - Traversal time (formatted using utility)
   - Connected nodes section with links
   - Set encounters (if `encounters` array populated)
   - Random encounters (`RandomEncounterTable` if `encounterOverrides` present)

4. **Test with dev server**
   ```bash
   npm run dev
   # Visit node and edge detail pages
   ```

### Deliverables
- Working node/edge detail pages
- Route disambiguation working correctly
- All sections rendering for both node and edge views

### Commit Point
Commit message: "Add pointcrawl node/edge detail page"

---

## Phase 7: Hex Page Integration

### Tasks

1. **Identify hex detail component**
   - Find where hex details are rendered (likely `GmHexDetails.svelte` or similar)
   - Understand how data is passed to the component

2. **Add pointcrawl lookup**
   - Query pointcrawls collection
   - Filter to those where `hexIds` includes current hex ID
   - Pass matching pointcrawls to the component

3. **Add Pointcrawls section to hex display**
   - Only show section if there are matching pointcrawls
   - Display as list of links to pointcrawl detail pages
   - Example: "Pointcrawls: [Skyspire Base Station](/gm-reference/pointcrawls/skyspire-base)"

4. **Test with dev server**
   ```bash
   npm run dev
   # Visit hex page that has a pointcrawl (e.g., /session-toolkit/hexes/skyspire)
   ```

### Deliverables
- Hex pages show links to accessible pointcrawls
- Bidirectional navigation: hex → pointcrawl and pointcrawl → hex

### Commit Point
Commit message: "Add pointcrawl links to hex detail pages"

---

## Post-Implementation

### Verification Checklist
- [ ] All three pointcrawl pages render without errors
- [ ] Navigation between pages works (list → detail → node/edge)
- [ ] Entry points display correctly on detail page
- [ ] Accordion groups nodes by level (or flat list if single level)
- [ ] Traversal time formats correctly (symmetric and asymmetric)
- [ ] Connected edges/nodes show proper links
- [ ] Validation script catches duplicate IDs
- [ ] Hex pages show pointcrawl links when applicable

### Optional Follow-up
- Add pointcrawls to GM Reference navigation/sidebar
- Create additional pointcrawl data as needed

---

## File Summary

### New Files
```
apps/web/src/pages/gm-reference/pointcrawls/
├── index.astro
├── [id].astro
└── [id]/
    └── [nodeOrEdgeId].astro

apps/web/src/utils/pointcrawl.ts
apps/web/scripts/validate-pointcrawl-ids.ts

data/pointcrawls/skyspire-base.yml
data/pointcrawl-nodes/skyspire-base/*.mdx
data/pointcrawl-edges/skyspire-base/*.mdx
```

### Modified Files
```
packages/schemas/src/schemas/pointcrawl-node.ts  (add isEntry field)
packages/schemas/src/index.ts                     (verify exports)
apps/web/package.json                             (add validate script)
apps/web/src/components/GmHexDetails.svelte       (add pointcrawl links - Phase 7)
```

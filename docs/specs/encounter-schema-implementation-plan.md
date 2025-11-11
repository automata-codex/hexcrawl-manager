# Encounter Schema Implementation Plan

## Overview

This document outlines the implementation plan for updating the Encounter schema and related functionality to support external content files and remove the deprecated `weight` field.

**Status**: Ready for implementation
**Created**: 2025-11-11
**Related Spec**: [encounter-system.md](./encounter-system.md)

---

## Goals

1. **Make `description` field optional** - Allow encounters to use only external content files
2. **Add `contentPath` field** - Support external markdown files for rich narrative content
3. **Add schema refinement** - Ensure at least one of `description` or `contentPath` is provided
4. **Remove `weight` field** - Weight belongs in encounter table entries, not encounter definitions
5. **Render external content** - Update web app to load and display markdown from `contentPath`
6. **Add build-time validation** - Fail fast if referenced content files are missing

---

## Current State Analysis

### Schema (`packages/schemas/src/schemas/encounter.ts`)

**Current:**
```typescript
export const EncounterSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),              // REQUIRED (should be optional)
    statBlocks: z.array(z.string()),
    weight: z.number().default(1),         // DEPRECATED (should be removed)
  })
  .describe('EncounterSchema');
```

**Issues:**
- `description` is required, should be optional
- Missing `contentPath` field
- No refinement to ensure at least one content field exists
- `weight` field is deprecated

### Data Files (`data/encounters/`)

- **Total encounters**: 63 YAML files
- **All have `description` field**: No migration needed for required → optional change
- **None have `weight` field**: No cleanup needed
- **None have `contentPath` field yet**: Good, clean starting point

### Web Application

**List View** (`apps/web/src/pages/gm-reference/encounters/index.astro`):
- Shows encounter names only
- No content rendering needed
- **Status**: ✅ No changes required

**Detail View** (`apps/web/src/pages/gm-reference/encounters/[id].astro`):
- Currently renders `description` directly (line 184)
- No support for external content loading
- **Status**: ❌ Needs update to support `contentPath`

**Content Collection** (`apps/web/src/content.config.ts`):
- Uses `glob` loader for YAML files (line 122)
- **Status**: ✅ No changes required

---

## Implementation Steps

### Phase 1: Schema Updates

#### 1.1 Update EncounterSchema

**File**: `packages/schemas/src/schemas/encounter.ts`

**Changes**:
```typescript
export const EncounterSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),    // Make optional
    contentPath: z.string().optional(),    // Add new field
    statBlocks: z.array(z.string()),
    // Remove: weight: z.number().default(1),
  })
  .refine(
    (data) => data.description || data.contentPath,
    {
      message: "Either 'description' or 'contentPath' must be provided",
    }
  )
  .describe('EncounterSchema');
```

**Testing**:
- Existing encounters should still validate (all have `description`)
- Schema should reject encounters with neither field
- TypeScript types should reflect optional fields

#### 1.2 Regenerate JSON Schemas

**Command**: `npm run build:json-schemas`

**Files Updated**: `packages/schemas/generated/*.json`

**Verification**:
- Check generated JSON schema matches Zod schema
- Commit generated files with schema changes

---

### Phase 2: Web Application Updates

#### 2.1 Update Encounter Detail Page

**File**: `apps/web/src/pages/gm-reference/encounters/[id].astro`

**Current Rendering** (line 183-185):
```astro
<div class="description">
  <Fragment set:html={renderMarkdown(encounter.description)} />
</div>
```

**New Logic**:

1. **Render description as summary** (if present):
```astro
{encounter.description && (
  <div class="summary">
    <h2>Summary</h2>
    <Fragment set:html={renderMarkdown(encounter.description)} />
  </div>
)}
```

2. **Load and render external content** (if present):
```astro
{encounter.contentPath && (
  <div class="content">
    <EncounterContent encounterId={id} contentPath={encounter.contentPath} />
  </div>
)}
```

**Path Resolution Strategy**:

Since Astro content collections use `glob` loaders, we need to:
- Resolve `contentPath` relative to `data/encounters/` directory
- Use `readFile` or similar to load markdown content
- Pass through markdown renderer

**Implementation Options**:

**Option A: Server-side component** (Recommended)
- Create `EncounterContent.astro` component
- Use Node.js `fs` to read file at build time
- Render markdown using existing `renderMarkdown` utility

**Option B: Extend content collection**
- Add markdown files to encounters collection
- Reference by ID instead of path
- More Astro-native but requires restructuring

**Recommendation**: Option A for simplicity and spec compliance

#### 2.2 Create EncounterContent Component

**New File**: `apps/web/src/components/EncounterContent.astro`

```astro
---
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { renderMarkdown } from '../utils/markdown';

interface Props {
  encounterId: string;
  contentPath: string;
}

const { encounterId, contentPath } = Astro.props;

// Resolve path relative to encounters directory
const encountersDir = join(process.cwd(), 'data/encounters');
const fullPath = join(encountersDir, contentPath);

let content: string;
try {
  content = await readFile(fullPath, 'utf-8');
} catch (error) {
  throw new Error(
    `Failed to load content for encounter "${encounterId}" at path "${contentPath}": ${error.message}`
  );
}

const rendered = renderMarkdown(content);
---

<div class="encounter-content">
  <Fragment set:html={rendered} />
</div>
```

**Error Handling**:
- Missing files throw build-time errors (fail fast)
- Clear error messages for debugging
- No runtime errors in production

---

### Phase 3: Build-Time Validation

#### 3.1 Content Path Validation

**Approach**: Add validation to content collection loader

**File**: `apps/web/src/content.config.ts`

**Option A: Custom loader** (More control)
```typescript
const encounters = defineCollection({
  loader: async () => {
    const encounters = await glob({
      pattern: '**/*.{yaml,yml}',
      base: DIRS.ENCOUNTERS
    });

    // Validate contentPath files exist
    for (const encounter of encounters) {
      if (encounter.data.contentPath) {
        const fullPath = join(DIRS.ENCOUNTERS, encounter.data.contentPath);
        if (!existsSync(fullPath)) {
          throw new Error(
            `Encounter "${encounter.id}" references missing content file: ${encounter.data.contentPath}`
          );
        }
      }
    }

    return encounters;
  },
  schema: EncounterSchema,
});
```

**Option B: Post-build validation script** (Simpler)
- Add script to validate after content collection loads
- Run during build process
- Easier to maintain

**Recommendation**: Option B for simplicity, can add Option A later if needed

#### 3.2 Create Validation Script

**New File**: `apps/web/scripts/validate-encounter-content.ts`

```typescript
import { getCollection } from 'astro:content';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ENCOUNTERS_DIR = join(process.cwd(), '../..', 'data/encounters');

async function validateEncounterContent() {
  const encounters = await getCollection('encounters');
  const errors: string[] = [];

  for (const encounter of encounters) {
    if (encounter.data.contentPath) {
      const fullPath = join(ENCOUNTERS_DIR, encounter.data.contentPath);
      if (!existsSync(fullPath)) {
        errors.push(
          `Encounter "${encounter.id}" references missing content file: ${encounter.data.contentPath}`
        );
      }
    }
  }

  if (errors.length > 0) {
    console.error('Encounter content validation failed:\n');
    errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }

  console.log(`✓ All ${encounters.length} encounters validated`);
}

validateEncounterContent();
```

**Integration**: Add to `prebuild` script in `apps/web/package.json`

---

### Phase 4: Data Updates

#### 4.1 Remove Weight Fields

**Status**: ✅ Not needed - no encounters currently have `weight` field

**Verification**:
```bash
grep -l "weight:" data/encounters/*.yml
```
Returns no results.

#### 4.2 Verify Existing Encounters

**All encounters should**:
- Have `id`, `name`, `description`, `statBlocks` fields
- Not have `weight` field
- Validate against new schema

**Test Command**:
```bash
npm run typecheck
npm run build:web
```

---

### Phase 5: Testing

#### 5.1 Schema Tests

**Location**: `packages/schemas/src/schemas/encounter.spec.ts`

**Test Cases**:
- ✅ Valid encounter with only `description`
- ✅ Valid encounter with only `contentPath`
- ✅ Valid encounter with both fields
- ❌ Invalid encounter with neither field
- ❌ Invalid encounter with `weight` field (if enforced)

#### 5.2 Integration Tests

**Test Scenarios**:
1. Build web app with existing encounters
2. Create test encounter with `contentPath`
3. Verify detail page renders external content
4. Verify missing content file fails build
5. Verify encounter without description works

#### 5.3 Manual Testing

**Checklist**:
- [ ] Encounter list page loads
- [ ] Encounter detail page with only `description` works
- [ ] Create test encounter with `contentPath`, verify it renders
- [ ] Verify error message if content file missing
- [ ] Check stat blocks still render
- [ ] Check roleplay books still match

---

## Implementation Order

### Recommended Sequence

1. **Update Schema** (Phase 1)
   - Low risk, foundation for other changes
   - Run tests after

2. **Add Validation** (Phase 3)
   - Prevents bad data during development
   - Catches issues early

3. **Update Web App** (Phase 2)
   - Build on validated schema
   - Test with real data

4. **Final Testing** (Phase 5)
   - Integration testing
   - Manual QA

### Commands to Run

```bash
# After schema changes
npm run build:json-schemas
npm run typecheck

# After all changes
npm run test
npm run build

# Start dev server for manual testing
npm run dev
```

---

## Migration Strategy

### For Existing Encounters

**Status**: No migration needed
- All 63 encounters have `description` field
- None have deprecated `weight` field
- Schema changes are backward compatible

### For New Encounters

**Three patterns available**:

1. **Summary Only**: Quick reference encounters
```yaml
id: goblin-patrol
name: Goblin Patrol
description: A group of 3-5 goblins on patrol.
statBlocks:
  - goblin
```

2. **Detailed Only**: Rich narrative encounters
```yaml
id: abandoned-watchtower
name: Abandoned Watchtower
contentPath: ./abandoned-watchtower.md
statBlocks:
  - bandit-captain
  - bandit
```

3. **Both**: Best of both worlds
```yaml
id: dragon-lair
name: Dragon Lair
description: Ancient red dragon in mountain cavern.
contentPath: ./dragon-lair.md
statBlocks:
  - adult-red-dragon
```

---

## Rollback Plan

### If Issues Arise

1. **Revert Schema Changes**
   - Git revert schema commit
   - Regenerate JSON schemas
   - Rebuild

2. **Revert Web App Changes**
   - Remove `EncounterContent` component
   - Restore original detail page rendering
   - Remove validation script

3. **No Data Rollback Needed**
   - No encounter files were modified
   - Schema is backward compatible

---

## Future Enhancements

### Not in Scope (Future Work)

1. **Multiple Content Files**
   - `contentPath` as array
   - Modular content sections

2. **Content Templates**
   - Variable substitution in markdown
   - Dynamic encounter generation

3. **Media Support**
   - Images, maps, handouts
   - Rich media references

4. **Content Caching**
   - Cache rendered markdown
   - Improve build performance

---

## Dependencies

### Packages to Install

None - all required functionality exists:
- `node:fs/promises` - Built-in
- `node:path` - Built-in
- `zod` - Already installed
- Astro content collections - Already configured

### Architectural Constraints

Per `.dependency-cruiser.cjs` and `CLAUDE.md`:
- Web app can read from `data/` directory at build time
- Use barrel exports for shared utilities
- Follow existing patterns (see `DungeonDetails.astro` for reference)

---

## Success Criteria

### Definition of Done

- ✅ Schema updated and tests pass
- ✅ JSON schemas regenerated
- ✅ Web app renders external content
- ✅ Build fails if content files missing
- ✅ All existing encounters still work
- ✅ TypeScript compilation succeeds
- ✅ All tests pass
- ✅ Manual testing completed
- ✅ Documentation updated (this plan!)

### Verification Commands

```bash
npm run typecheck      # TypeScript checks
npm run test           # All tests pass
npm run build          # Full build succeeds
npm run dev            # Dev server works
```

---

## Notes

### Design Decisions

1. **Path Resolution**: Relative to `data/encounters/` for co-location
2. **Error Handling**: Build-time failures for missing files
3. **Backward Compatibility**: All existing encounters continue to work
4. **Content Strategy**: Three patterns (summary, detail, both) for flexibility

### Reference Implementations

Similar patterns in codebase:
- **Dungeons**: Use markdown files with frontmatter, render with `render()` (DungeonDetails.astro:23)
- **Roleplay Books**: Match by keywords (encounter detail page:111-119)
- **Stat Blocks**: Load and render in detail pages (encounter detail page:193-205)

### Open Questions

- Should we support nested directories in `contentPath`? (e.g., `./tier-1/goblin-ambush.md`)
- Should we add a `shortDescription` for even more granular control?
- Should validation be build-time only or also runtime?

**Recommendation**: Start simple (flat structure, build-time only), iterate based on usage.

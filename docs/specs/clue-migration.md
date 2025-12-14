# Clue System Migration Spec (Steps 1–4)

This document specifies the work needed to implement the new unified clue system through the initial validation phase.

## Step 1: Create the New Clue Schema and Collection

### 1.1 Create Schema File

**File:** `packages/schemas/src/schemas/clue.ts`

```typescript
import { z } from 'zod';

import { FactionEnum } from './encounter';

export const ClueStatusEnum = z.enum(['unknown', 'known']);

export const ClueSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    summary: z.string().describe('Brief description of the fact'),
    details: z
      .string()
      .optional()
      .describe('Extended GM-facing information about this clue'),

    // Structured taxonomy
    factions: z
      .array(FactionEnum)
      .optional()
      .describe('Factions this clue relates to'),
    plotlines: z
      .array(z.string())
      .optional()
      .describe('Plotline IDs this clue belongs to (e.g., "milly-and-baz")'),

    // Flexible categorization
    tags: z
      .array(z.string())
      .optional()
      .describe('Additional tags for filtering (themes, characters, etc.)'),

    status: ClueStatusEnum.default('unknown'),
  })
  .describe('ClueSchema');

export type ClueData = z.infer<typeof ClueSchema>;
export type ClueStatus = z.infer<typeof ClueStatusEnum>;
```

### 1.2 Export from Schema Package

**File:** `packages/schemas/src/index.ts`

Add export:
```typescript
export * from './schemas/clue';
```

### 1.3 Create Content Collection

**Location:** `data/clues/`

Create directory for clue YAML files.

### 1.4 Register Collection in Astro

**File:** `src/content/config.ts` (or equivalent)

Add clues collection using ClueSchema for validation.

### 1.5 Generate JSON Schema

Run existing script to generate JSON schema for IDE type hints in YAML files.

---

## Step 2: Build One Clue for Milly's Plotline

### 2.1 Create Test Clue

**File:** `data/clues/gruelith-target-resonant-beings.yaml`

```yaml
id: gruelith-target-resonant-beings
name: Gruelith Target Resonant Beings
summary: The gruelith disproportionately target tieflings and sorcerers in their slave raids.
details: |
  Orc patrols and survivors of gruelith raids report a pattern: the raiders seem to
  prioritize capturing tieflings and those with innate magical ability. The orcs
  believe it has something to do with the gruelith's strange devices and rituals,
  though they don't understand the connection.

  This targeting behavior suggests the gruelith are using magically-attuned individuals
  for something beyond simple labor — possibly as conduits or calibration sources for
  their dimensional technology.
factions: []
plotlines:
  - milly-and-baz
tags:
  - gruelith
  - slave-raids
status: unknown
```

### 2.2 Update Milly's Plotline Outline

**File:** `data/plotlines/milly-and-baz.md`

Add link from clues section to the new clue:
```markdown
## Clues

- [Gruelith Target Resonant Beings](/session-toolkit/clues/gruelith-target-resonant-beings)
```

### 2.3 Verify Build

- Confirm Astro builds without errors
- Confirm schema validation passes
- Confirm clue appears in content collection

---

## Step 3: Build the Display Page for Clues

### 3.1 Individual Clue Page

**File:** `src/pages/session-toolkit/clues/[id].astro`

Display:
- Name (h1)
- Summary (prominent text)
- Status badge (unknown/known)
- Factions (linked to faction pages if they exist)
- Plotlines (linked to plotline pages)
  - **Warning icon** if a plotline ID doesn't match any actual plotline file
- Tags (linked/filterable)
- Details (collapsible or secondary section)
- "Used in" section (populated in step 4)

**Plotline validation**: At build time, collect all plotline IDs from `data/plotlines/`. When rendering the clue page, compare each entry in the clue's `plotlines` array against this list. Display a warning icon (⚠️ or similar) next to any plotline ID that doesn't have a corresponding file. This catches typos and orphaned references.

### 3.2 Clue Index Page

**File:** `src/pages/session-toolkit/clues/index.astro`

Display:
- List of all clues
- Filter by status (unknown/known)
- Filter by faction
- Filter by plotline
- Filter by tag
- Search by name/summary
- Link to individual clue pages

### 3.3 All Clues Page (Optional)

**File:** `src/pages/session-toolkit/clues/all.astro`

Single-page view of all clues for quick reference during play.

---

## Step 4: Add Cross-Linking from Locations

### 4.1 Schema Updates Summary

All schema updates are collected here for reference.

---

#### 4.1.1 Encounter Schema

**File:** `packages/schemas/src/schemas/encounter.ts`

Add field to `EncounterSchema`:
```typescript
clues: z
  .array(z.string())
  .optional()
  .describe('IDs of clues that this encounter can reveal'),
```

---

#### 4.1.2 Hex Schema — Keyed Encounters

**File:** `packages/schemas/src/schemas/hex.ts`

Add new types:
```typescript
export const KeyedEncounterTriggerEnum = z.enum(['entry', 'exploration']);

export const KeyedEncounterSchema = z.object({
  encounterId: z.string(),
  trigger: KeyedEncounterTriggerEnum,
  notes: z.string().optional().describe('GM notes about when/how this triggers'),
});
```

Add field to `HexSchema`:
```typescript
keyedEncounters: z
  .array(KeyedEncounterSchema)
  .optional()
  .describe('Encounters that trigger under specific conditions in this hex'),
```

---

#### 4.1.3 Hex Schema — GM Notes with Dream-Clues

**File:** `packages/schemas/src/schemas/hex.ts`

Replace the existing `notes` field with a polymorphic schema that supports both simple strings and structured dream-clue notes:

```typescript
export const GmNoteSchema = z.union([
  z.string(),
  z.object({
    description: z.string(),
    clueId: z.string().optional().describe('If this note reveals a clue (e.g., a dream)'),
  }),
]);
```

Update the `notes` field in `HexSchema`:
```typescript
notes: z
  .array(GmNoteSchema)
  .optional()
  .describe('Private GM eyes-only notes; can include dream-clues with linked clue IDs'),
```

This allows existing simple string notes to continue working while enabling structured notes like:
```yaml
notes:
  - "The party camped here in session 12"
  - description: "Sleeping here triggers visions of glowing crystal conduits connecting a vast network"
    clueId: velari-conduit-network
```

---

#### 4.1.4 Hex Schema — Landmark Clues

**File:** `packages/schemas/src/schemas/hex.ts`

Add field to `LandmarkSchema`:
```typescript
clues: z
  .array(z.string())
  .optional()
  .describe('IDs of clues that can be discovered at this landmark'),
```

---

#### 4.1.5 Hex Schema — Hidden Site Clues

**File:** `packages/schemas/src/schemas/hex.ts`

Add field to `BaseHiddenSiteSchema`:
```typescript
clues: z
  .array(z.string())
  .optional()
  .describe('IDs of clues that can be discovered at this site'),
```

This propagates to all hidden site types (FactionLeadHiddenSiteSchema, ClueHiddenSiteSchema, PreplacedHiddenSiteSchema) via inheritance.

---

#### 4.1.6 Dungeon Room Schema

**File:** Identify existing dungeon/room schema

Add field:
```typescript
clues: z
  .array(z.string())
  .optional()
  .describe('IDs of clues that can be discovered in this room'),
```

---

#### 4.1.7 Pointcrawl Node Schema

**File:** `packages/schemas/src/schemas/pointcrawl-node.ts` (or equivalent)

Add field:
```typescript
clues: z
  .array(z.string())
  .optional()
  .describe('IDs of clues that can be discovered at this node'),
```

---

### 4.2 Build "Used In" Derivation

Create build-time script or loader that:
1. Scans all encounters for `clues` field references
2. Scans all hex landmarks for `clues` field references
3. Scans all hex hidden sites for `clues` field references
4. Scans all hex GM notes for `clueId` references (dream-clues)
5. Scans all hexes for `keyedEncounters` referencing encounters with clues
6. Scans all dungeon rooms for `clues` field references
7. Scans all pointcrawl nodes for `clues` field references
8. Populates a `usedIn` array on each clue with location references

Output structure per clue:
```typescript
usedIn: Array<{
  type: 'encounter' | 'hex-landmark' | 'hex-hidden-site' | 'hex-dream' | 'dungeon-room' | 'pointcrawl-node';
  id: string;
  name: string;
  hexId?: string; // For landmark/hidden-site/dream, which hex contains it
}>
```

### 4.3 Display "Used In" on Clue Page

Update individual clue page to show where each clue can be discovered, with links to those locations.

### 4.4 Create Test Encounter

**File:** `data/encounters/orc-patrol-gruelith-intel.yaml`

```yaml
id: orc-patrol-gruelith-intel
name: Orc Patrol with Gruelith Intelligence
description: |
  An orc patrol from Ilatharyn encounters the party. They are wary but not
  immediately hostile. If the party proves friendly, the orcs share information
  about their ongoing war with the gruelith.
statBlocks: []
scope: region
locationTypes:
  - wilderness
factions:
  - beldrunn-vok
clues:
  - gruelith-target-resonant-beings
```

### 4.5 Place Test Encounter

Either:
- Add to regional encounter table for hexes near L18, or
- Add as keyed encounter on a specific hex west of the Tivrajal River

---

## Validation Checklist

After completing steps 1–4:

- [ ] Clue schema exists and exports correctly
- [ ] Clue schema includes structured `factions` and `plotlines` fields
- [ ] At least one clue file validates and builds
- [ ] Clue display page renders correctly
- [ ] Clue display page shows warning icons for invalid plotline references
- [ ] Clue index page lists clues with filtering (by status, faction, plotline, tag)
- [ ] Encounter schema accepts `clues` field
- [ ] Hex schema accepts `keyedEncounters` field
- [ ] Hex schema accepts polymorphic `notes` field (strings and dream-clue objects)
- [ ] Landmark schema accepts `clues` field
- [ ] Hidden site schemas accept `clues` field
- [ ] Pointcrawl node schema accepts `clues` field
- [ ] At least one encounter references a clue
- [ ] "Used in" derivation populates correctly (including dream-clues)
- [ ] Clue page shows where it can be discovered
- [ ] Plotline outline links to clue page correctly

---

## Out of Scope (Later Steps)

- Migrating existing floating clues
- Extracting fixed clues from prose articles
- Migrating knowledge tree content
- Removing duplicate infrastructure
- Updating floating clue linker

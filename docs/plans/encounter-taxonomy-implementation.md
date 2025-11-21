# Encounter Taxonomy Implementation Plan

This plan implements the spec at `docs/specs/encounter-taxonomy.md` in phases, allowing for manual review and git commits between each phase.

---

## Phase 1: Schema Updates

**Goal:** Add new fields to all affected schemas (encounter, dungeon, hex, region)

**Work:**
- Add `scope`, `locationTypes`, `factions`, `creatureTypes`, `usedIn` to encounter schema
- Add refinement for `locationTypes` required when `scope === 'general'`
- Add `encounters` array to dungeon schema, deprecate `statBlocks`
- Add `encounters` array to hex schema
- Add `encounterIds` array to region schema
- Regenerate JSON schemas (`npm run build:json-schemas`)
- Run typecheck to ensure no breaking changes

**Review focus:** Schema correctness, enum values, validation rules

**Status:** Complete

---

## Phase 2: Build-Time Processors

**Goal:** Create the logic for deriving creature types and tracking usage

**Work:**
- Create `apps/web/src/utils/encounter-processor.ts` (creature type derivation)
- Create `apps/web/src/utils/encounter-usage-tracker.ts` (usage mapping)
- Hook into Astro content processing to augment encounter data at build time
- Test with `npm run build:web` to verify processors run without errors

**Review focus:** Processing logic correctness, integration approach

**Status:** Not started

---

## Phase 3: Migration Script

**Goal:** Create the one-time migration script (but don't run it yet)

**Work:**
- Create `scripts/one-time-scripts/migrate-encounter-taxonomy.ts`
- Implement inference logic for scope, locationTypes, factions
- Implement report generation with confidence levels
- Add dry-run mode for safe testing

**Review focus:** Inference heuristics, faction keyword mappings, report format

**Status:** Not started

---

## Phase 4: Execute Migration

**Goal:** Run migration and review results

**Work:**
- Run migration script in dry-run mode first
- Review generated report (especially low-confidence cases)
- Run actual migration
- Manually adjust any incorrect inferences
- Validate YAML syntax on modified files

**Review focus:** Actual data changes, low-confidence cases needing manual adjustment

**Status:** Not started

---

## Phase 5: UI Implementation

**Goal:** Add filtering to encounter list and taxonomy display to detail page

**Work:**
- Update `apps/web/src/pages/gm-reference/encounters/index.astro` with filter UI
- Add client-side filtering logic (scope, location, faction, creature type, usage status)
- Update `apps/web/src/pages/gm-reference/encounters/[id].astro` with taxonomy display
- Add usage links section showing where encounter is referenced
- Style badges and filter components

**Review focus:** UI/UX, filter behavior, styling

**Status:** Not started

---

## Phase 6: Documentation

**Goal:** Update specs and finalize

**Work:**
- Update `docs/specs/encounter-system.md` with new taxonomy section
- Verify all success criteria from spec are met
- Final build and smoke test

**Review focus:** Documentation accuracy, completeness

**Status:** Not started

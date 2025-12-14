# Herald Encounters Implementation Plan

A gating mechanism ensuring players receive a curated introductory encounter when first entering a new region, before normal encounter mechanics become available.

See `docs/specs/herald-encounters.md` for the full specification.

---

## Phase 1: Schema Changes

**Goal**: Add the data model for herald encounters without any UI changes.

**Files to modify**:

| File | Change |
|------|--------|
| `packages/schemas/src/schemas/encounter.ts` | Add `"herald"` to `EncounterScopeEnum` |
| `packages/schemas/src/schemas/region.ts` | Add `heraldEncounters: string[]` (optional array of encounter IDs) and `heraldComplete: boolean` (optional, defaults to false) |

**Verification**:
- `npm run build:json-schemas` — regenerate JSON schemas
- `npm run typecheck` — ensure no type errors

---

## Phase 2: Display Logic (Region & Hex Pages)

**Goal**: Conditionally show herald encounters instead of normal encounter tables when herald is active.

**Herald active condition**: `!region.heraldComplete && region.heraldEncounters?.length > 0`

**Files to modify**:

| File | Change |
|------|--------|
| `apps/web/src/components/RegionDetails/RegionDetails.astro` | Conditionally hide `RandomEncounterTable`; show herald encounter list instead |
| `apps/web/src/pages/session-toolkit/hexes/[id].astro` | Same conditional logic; override `encounterChance` to 50 when herald active |

**New components/utilities**:
- Simple herald encounter list component (displays encounter names as links)
- Helper function to check herald status (can be inline or extracted)

**Display decisions**:
- Herald encounters shown as a simple list with links (not using RandomEncounterTable)
- All herald encounters displayed together when multiple exist
- Encounter chance overridden to flat 50% (shown as "50% (≤10)") on hex pages

**Verification**:
- Add `heraldEncounters` to a test region and verify display
- `npm run build:web` succeeds

---

## Phase 3: API Endpoint & Completion UI

**Goal**: Allow GM to mark herald phase complete via UI button.

**New file**:

| File | Purpose |
|------|---------|
| `apps/web/src/pages/api/regions/[id]/complete-herald.ts` | POST endpoint to set `heraldComplete: true` in region YAML |

API follows pattern from `apps/web/src/pages/api/todo/update.ts`:
- GM-only authorization check
- Read region YAML, update `heraldComplete`, write back
- Return success/error JSON

**Files to modify**:

| File | Change |
|------|--------|
| `apps/web/src/components/RegionDetails/RegionDetails.astro` | Add herald active banner/badge; add "Mark Herald Complete" button |
| `apps/web/src/pages/session-toolkit/hexes/[id].astro` | Same banner and button (button marks the **region's** herald complete) |

**UI elements**:
- Visual indicator (banner or badge) showing herald phase is active
- Button to mark herald complete (triggers API, then refreshes page or updates UI)

**Verification**:
- Test API endpoint directly
- Test full flow: herald active → click complete → normal encounters shown
- Verify `heraldComplete: true` persists in region YAML

---

## Edge Cases

- Empty/missing `heraldEncounters` → skip herald phase entirely, show normal encounters
- `heraldComplete: true` persists permanently once set
- Hex pages inherit herald status from their region

# Herald Encounter System — Implementation Spec

## Overview

A gating mechanism ensuring players receive a curated introductory encounter when first entering a new region, before normal encounter mechanics become available.

## Schema Changes

**Encounter schema** — add new scope value:
- Add `"herald"` to the `scope` enum (alongside existing values like `"region"`, `"hex"`, etc.)

**Region schema** — add two fields:
- `heraldEncounters`: Array of encounter IDs (strings referencing encounters with `scope: "herald"`)
- `heraldComplete`: Boolean, defaults to `false` if missing

## Display Logic

**When herald is active** (`heraldComplete` is false/missing AND `heraldEncounters` is non-empty):
- Suppress normal encounter table display
- Show only the referenced herald encounter(s)
- Override `encounterChance` to flat `50` (integrating with existing variable in hex page)

**When herald is complete** (`heraldComplete: true` OR `heraldEncounters` is empty/missing):
- Display normal encounter mechanics unchanged

## Files to Modify

| File                                                           | Change                                                                                                   |
|----------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| `packages/schema/src/encounter.ts` (or similar)                | Add `"herald"` to scope enum                                                                             |
| `packages/schema/src/region.ts` (or similar)                   | Add `heraldEncounters` and `heraldComplete` fields                                                       |
| `apps/web/src/pages/session-toolkit/regions/[id]/index.astro`  | Conditionally hide encounter tables; show herald encounters; add completion toggle                       |
| `apps/web/src/pages/session-toolkit/hexes/[id].astro`          | Conditionally hide encounter tables; show herald encounters; override `encounterChance` to 50            |
| `apps/web/src/pages/api/regions/[id]/complete-herald.ts` (new) | API endpoint to set `heraldComplete: true`, following pattern in `apps/web/src/pages/api/todo/update.ts` |

## UI Requirements

- Visual indicator showing herald phase is active (banner or badge)
- Button to mark herald complete (triggers API mutation)
- Herald encounter(s) displayed using existing encounter display components

## Edge Cases

- Empty/missing `heraldEncounters` → skip herald phase entirely
- `heraldComplete` persists permanently once set

# @skyreach/data

## 4.0.0

### Major Changes

- 0f0d0f7: **BREAKING CHANGE:** Refactor repo after code/data split
  - Add file extensions to imports
  - Add placeholder data
  - Add license
  - **BREAKING CHANGE:** Implement configurable data directory
  - Update tests

### Minor Changes

- 8726d51: Flexible map configuration

  This release makes the hex map system flexible and data-driven rather than hardcoded to specific dimensions.

  **Breaking Changes:**
  - `regionId` removed from hex schema - regions now own hex membership via `region.hexes[]`
  - `region.hexes` is now required (was optional)
  - Coordinate functions (`parseHexId`, `hexSort`, `getHexNeighbors`, `parseTrailId`, etc.) now require `notation` parameter - no more hardcoded defaults

  **New Features:**
  - Centralized coordinate utilities in `@achm/core` with support for `letter-number` and `numeric` notation
  - New `map.yaml` configuration file defines grid dimensions, notation, and out-of-bounds hexes
  - New `/api/map-config.json` endpoint exposes map configuration to frontend
  - Regions define default `terrain` and `biome` for their hexes
  - Hex files are optional - hexes without files inherit region defaults
  - Prebuild validation catches configuration errors (duplicate assignments, invalid coordinates)
  - Interactive map calculates viewBox from actual hex data
  - New "Fit to View" button on interactive map

  **Migration:**
  - Hex files reorganized from `hexes/region-X/` to `hexes/col-X/` structure
  - Region files now include `hexes` array listing member hex IDs
  - `regionId` field removed from hex files (derived from region membership)

- 0c99f12: Rename package namespace

### Patch Changes

- 52b773f: Add milestone AP allocation support and fix flaky integration tests

  **Milestone AP Feature:**
  - Add `ap milestone "<note>"` command in scribe to create a todo for milestone AP allocation
  - Refactor `weave allocate ap` to use subcommands: `absence` (existing) and `milestone` (new)
  - Add `milestone_spend` entry type to the AP ledger schema
  - Milestone allocations always grant 3 AP total, split across pillars by the user

  **Breaking Change:**
  - Old syntax `weave allocate ap --character ...` no longer works
  - Must use `weave allocate ap absence --character ...` instead

  **CLI Commands:**

  ```bash
  # Scribe - during session
  ap milestone "Survived the Winter of 1512"

  # Weave - allocate absence credits (existing, renamed)
  weave allocate ap absence --character alice --amount 2 --combat 1 --exploration 1

  # Weave - allocate milestone AP (new)
  weave allocate ap milestone --character alice --combat 1 --exploration 1 --social 1 --note "Winter survival"
  ```

  **Test Infrastructure:**
  - Fix flaky integration tests by configuring vitest to use forks pool for integration tests
  - Add retry mechanism to `runWeave` and `runScribe` test helpers for transient SIGSEGV failures

## 3.3.0

### Minor Changes

- f83daea: Add GM dashboard
- ec7e954: Clean up and prune dead and deprecated code
  - @skyreach/data: Update repo paths
  - @skyreach/schemas: **BREAKING CHANGE:** Remove deprecated schemas
  - @skyreach/web: Remove dead code

## 3.2.0

### Minor Changes

- e3ef0c9: Made the side nav menu and article routes configurable from YAML rather than hard-coded into the web app's logic. This allows for easier updates and customization of the navigation structure without needing to modify the application code directly.

## 3.0.0

### Major Changes

- 39e37e8: Minor updates:
  - BREAKING CHANGE: Move `rollDice` to from @skyreach/data to @skyreach/core
  - Update `scribe move` to display a reminder when moving along permanent trails

### Minor Changes

- e0d25c5: Add hex processing to `weave apply`
- b30babe: Backfill session logs
- 20630f5: Wire web app to read character AP from AP ledger

### Patch Changes

- d790497: Update callsites to accept new or old form of session filename
- ec8befc: Implement scribe fast-travel command

## 2.5.0

### Minor Changes

- 3f9dc1b: Implement `weave allocate ap` command
- 65916d2: Add `SessionId` branded type; add `scribe start` interactive mode
- feeb18e: Improve and test discovery for `weave apply`.
- fee59a4: Update `scribe` tests; add GitHub Action ti run tests on every PR
- 933be02: Add support for `meta.yaml` v2

## 2.4.0

### Minor Changes

- 56f881b: Refactor AP ledger file to use JSONL format
- 71168aa: Add `weave ap status` command
- 7f491a3: Migrate `weave ap apply` to `weave apply ap`
- 1fbb9ef: Migrate `weave apply trails` to new command structure
- c7a19f4: Migrate helpers and shared functions from the CLI to shared packages
- 8ea1ad4: Initialize packages

### Patch Changes

- 2552397: Update linting and formatting rules

# @skyreach/core

## 4.0.0

### Major Changes

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

### Minor Changes

- 0c99f12: Rename package namespace
- 8ea782e: ### Map and Region Improvements
  - **Configurable map label font**: Added `labelFont` option to map grid config (defaults to Source Sans 3)
  - **Hex ID display**: Map labels now correctly respect the coordinate notation setting (numeric vs letter-number)
  - **Region ID flexibility**: Support both numbered (`region-1`) and named (`skyreach-highlands`) region IDs
    - Numbered regions display as "Region 1: Name"
    - Named regions display as "Region: Name"
    - New functions: `getRegionShortTitle()`, `getRegionFullTitle()`, `getRegionNumber()`
    - Sorting: numbered regions first (numerically), then named regions (alphabetically, ignoring articles)
  - **Map-aware neighbors**: `getHexNeighbors()` now accepts optional `MapConfig` to filter by grid bounds and out-of-bounds list

  ### Style Fixes
  - Fixed paragraph spacing in map detail panel, region pages, NPC pages, and rumor details
  - Fixed stat block component spacing and colors
  - Disabled `svelte/no-useless-mustaches` ESLint rule

### Patch Changes

- ec425a4: Add keyed encounters display and improve hex catalog search

  **Keyed Encounters:**
  - Display keyed encounters on hex detail pages with encounter name, trigger type, and notes
  - Track keyed encounters in encounter usage map so they no longer appear as "unused"

  **Hex Catalog Improvements:**
  - Support numeric coordinate notation (e.g., "0303") in addition to letter-number (e.g., "F12")
  - Enable prefix matching for hex ID search (e.g., "04" matches 0401, 0402, etc.)
  - Simplify search results to show data bar and searchable fields only
  - Fix notes search to handle both string and object note formats

  **Rumors Page:**
  - Convert rumors index to a simple dynamic list instead of hardcoded random table
  - Remove redundant "all rumors" page

  **Core Package:**
  - Export `LETTER_NUMBER_PREFIX_RE` and `NUMERIC_PREFIX_RE` patterns for hex ID prefix matching

- 0f0d0f7: **BREAKING CHANGE:** Refactor repo after code/data split
  - Add file extensions to imports
  - Add placeholder data
  - Add license
  - **BREAKING CHANGE:** Implement configurable data directory
  - Update tests

- Updated dependencies [52b773f]
- Updated dependencies [3d0d8ba]
- Updated dependencies [3b23d23]
- Updated dependencies [8726d51]
- Updated dependencies [0c99f12]
- Updated dependencies [0f0d0f7]
- Updated dependencies [87fad0b]
- Updated dependencies [2252ac4]
- Updated dependencies [8ea782e]
  - @achm/schemas@5.0.0

## 3.1.0

### Minor Changes

- 7eb674e: Add new information architecture for clues

### Patch Changes

- Updated dependencies [f83daea]
- Updated dependencies [4978f44]
- Updated dependencies [7eb674e]
- Updated dependencies [ec7e954]
- Updated dependencies [89c8f82]
- Updated dependencies [0b6649c]
  - @skyreach/schemas@4.0.0

## 3.0.0

### Minor Changes

- 39e37e8: Minor updates:
  - BREAKING CHANGE: Move `rollDice` to from @skyreach/data to @skyreach/core
  - Update `scribe move` to display a reminder when moving along permanent trails
- ec8befc: Implement scribe fast-travel command

### Patch Changes

- Updated dependencies [e0d25c5]
- Updated dependencies [ca23cfc]
- Updated dependencies [ec8befc]
- Updated dependencies [b30babe]
  - @skyreach/schemas@3.0.0

## 2.5.0

### Minor Changes

- cbfd8ed: Update tests with fixture factories
- feeb18e: Improve and test discovery for `weave apply`.

### Patch Changes

- 65916d2: Add `SessionId` branded type; add `scribe start` interactive mode
- Updated dependencies [cbfd8ed]
- Updated dependencies [65916d2]
- Updated dependencies [feeb18e]
- Updated dependencies [ba530e6]
- Updated dependencies [fee59a4]
- Updated dependencies [933be02]
  - @skyreach/schemas@2.5.0

## 2.4.0

### Minor Changes

- 7f491a3: Migrate `weave ap apply` to `weave apply ap`
- 1fbb9ef: Migrate `weave apply trails` to new command structure
- ad6b2d2: Add prompts to `@skyreach/cli-kit` and move existing functionality to shared CLI services
- c7a19f4: Migrate helpers and shared functions from the CLI to shared packages
- 8ea1ad4: Initialize packages

### Patch Changes

- 2552397: Update linting and formatting rules
- Updated dependencies [56f881b]
- Updated dependencies [71168aa]
- Updated dependencies [c7a19f4]
- Updated dependencies [8ea1ad4]
- Updated dependencies [2552397]
  - @skyreach/schemas@2.4.0

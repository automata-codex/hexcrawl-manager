# @skyreach/schemas

## 5.0.0

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

- 3d0d8ba: Data-driven map icons and layers

  This release replaces hardcoded map icon rendering with a flexible, data-driven system configured via `map.yaml`.

  **New Features:**
  - Icons defined in `map.yaml` with `icons` section (SVG file + default size)
  - Tag-based icon rendering via `tagIcons` section (map hex tags to icons with optional styling)
  - Per-hex custom icons via `mapIcon` field in hex YAML files
  - Campaign-specific layers defined in `map.yaml` with visibility and scope controls
  - SVG symbols loaded from both framework icons and `data/map-assets/` directory
  - Prebuild validation catches undefined icon/layer references

  **Layer System:**
  - Framework layers (hex borders, labels, biomes, terrain, rivers, trails) remain hardcoded
  - Campaign layers from `map.yaml` render above framework layers
  - Custom icons layer renders above campaign layers
  - Layers panel displays in visual stacking order (top layer first)
  - Layer scopes now properly validated against `ScopeSchema`

  **Migration:**
  - Campaign-specific icons (e.g., `icon-fort-dagaric.svg`) should move to `data/map-assets/`
  - Hardcoded icon rendering replaced with `tagIcons` configuration

- 3b23d23: Add lair actions support to stat blocks

  **Schema:**
  - Add `lair_actions_intro` field for introductory text (e.g., "On initiative count 20, roll 1d4")
  - Add `lair_actions` array field with `name` and `desc` for each lair action

  **Web App:**
  - New `LairActions.astro` component to display lair actions in stat blocks
  - Lair actions render after reactions when present

- 0c99f12: Rename package namespace
- 87fad0b: Add sample data for open-source release

  This change introduces a complete starter data set demonstrating core hexcrawl-manager
  features through the "Thornwick Village" mini-campaign. The sample data includes:
  - 1 region with encounter tables
  - 7 hexes covering a 3x3 grid
  - 1 dungeon (The Broken Tower) with rooms, treasure, and encounters
  - 6 encounters demonstrating various encounter types
  - 5 stat blocks (goblins, wolf, spider, boss monster)
  - 3 factions with relationships
  - 4 NPCs
  - 1 character
  - 1 roleplay book with intelligence reports
  - 1 clue and 3 rumors
  - Complete routes.yml, sidebar.yml, and map.yaml configuration
  - Starter CSS with Fraunces (headings) and Source Serif 4 (body) fonts

  Schema updates:
  - Made `factions` optional in clue schema
  - Made `pritharaVariants` optional in roleplay book schema
  - Changed `FactionEnum` from hardcoded enum to flexible `FactionId` string type
    (validation now done at build time via validate-faction-ids.ts)

  Web app improvements:
  - Consolidated ArticleLayout/SecretArticleLayout into ComponentLayout/SecretLayout
  - Moved article.css styles into global-styles.css

- 2252ac4: Add structured data for nobility
  - Add new schemas
  - **Content Update:** Revamp nobility page

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

- 0f0d0f7: **BREAKING CHANGE:** Refactor repo after code/data split
  - Add file extensions to imports
  - Add placeholder data
  - Add license
  - **BREAKING CHANGE:** Implement configurable data directory
  - Update tests

## 4.1.0

### Minor Changes

- dfeeeac: Expand encounter category tables
  - Allow both description tables and weighted tables
  - **Content Update:** Consolidate all scar site encounter tables into reusable encounter category tables

## 4.0.0

### Major Changes

- ec7e954: Clean up and prune dead and deprecated code
  - @skyreach/data: Update repo paths
  - @skyreach/schemas: **BREAKING CHANGE:** Remove deprecated schemas
  - @skyreach/web: Remove dead code
- 0b6649c: - **BREAKING CHANGE:** Remove deprecated fields `vegetation` and `elevation` from hex schema
  - **Content Update:** Remove explicit `elevation` field and use free text `topography` field instead

### Minor Changes

- f83daea: Add GM dashboard
- 4978f44: **Content Update:** Add "herald encounters" for regions
- 7eb674e: Add new information architecture for clues
- 89c8f82: **Content Update:** Build out region 29

## 3.3.0

### Minor Changes

- 91b7478: Expand encounter taxonomy and cross-referencing
- 934bdd5: Add pointcrawl rules
  - Expand pointcrawl node schema to include light sources
  - **Content Update:** Add pointcrawl rules
- 31a2356: Add schemas for pointcrawls
- 0712fd6: Minor updates:
  - Add optional flag ot hide random encounters for a specific hex
  - **Content Update:** Add locations and connections for the Skyspire deck 1
- d844fc0: **Content Update:** Add random encounters for Skyspire
- 7bcc551: Add spell collection and new spells
  - Add spell schema to `@skyreach/schemas`
  - Add spell catalog to `@skyreach/web`
  - **Content Update**: New spells added to the spell catalog

## 3.2.0

### Minor Changes

- c54fe00: Update and expand hidden sites schema
  - Add new hidden site sources
  - **Content Update:** Add hidden sites based on clues and faction leads
- 9e92518: Add encounter taxonomy and filtering
- e3ef0c9: Made the side nav menu and article routes configurable from YAML rather than hard-coded into the web app's logic. This allows for easier updates and customization of the navigation structure without needing to modify the application code directly.

### Patch Changes

- 72a2ade: **Content Update:** Add details for region 18

## 3.1.0

### Minor Changes

- 7cf8436: Expand roleplay books:
  - Add new data type
  - **Content Update:** Expand roleplay books for various cultures and species, including addition of "intelligence reports"
- 5177911: Update encounter schema to support content from external markdown file
- fa083d7: **Content Update:** Add encounters and floating clues for intel reports

## 3.0.0

### Minor Changes

- e0d25c5: Add hex processing to `weave apply`
- ca23cfc: Fix time schemas
  - explicitly name fields
  - store segments everywhere
  - migrate old logs
- b30babe: Backfill session logs

### Patch Changes

- ec8befc: Implement scribe fast-travel command

## 2.5.0

### Minor Changes

- cbfd8ed: Update tests with fixture factories
- 65916d2: Add `SessionId` branded type; add `scribe start` interactive mode
- feeb18e: Improve and test discovery for `weave apply`.
- ba530e6: Update `scribe finalize` per spec
- fee59a4: Update `scribe` tests; add GitHub Action ti run tests on every PR
- 933be02: Add support for `meta.yaml` v2

## 2.4.0

### Minor Changes

- 56f881b: Refactor AP ledger file to use JSONL format
- 71168aa: Add `weave ap status` command
- c7a19f4: Migrate helpers and shared functions from the CLI to shared packages
- 8ea1ad4: Initialize packages

### Patch Changes

- 2552397: Update linting and formatting rules

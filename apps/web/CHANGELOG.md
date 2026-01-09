# @skyreach/web

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

- 0f0d0f7: **BREAKING CHANGE:** Refactor repo after code/data split
  - Add file extensions to imports
  - Add placeholder data
  - Add license
  - **BREAKING CHANGE:** Implement configurable data directory
  - Update tests

### Minor Changes

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

- b274f5a: Improve content collection loading for open-source users
  - Add conditional loaders that return empty arrays for directories with only `.gitkeep` files
  - Add `collectionHasContent()` helper to check if a directory has actual content
  - Add `yamlFileHasContent()` helper to check if a YAML file has non-empty content
  - Remove deprecated `getDirectoryYamlLoader` function
  - Migrate all collections to use Astro's `glob` loader instead of custom loader
  - Data files using array format must now be split into individual files (one per item)
  - Remove empty `.gitkeep` directories from demo data to reduce noise for new users

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

- 03267cd: Support synthetic hexes for region-only hex definitions

  Hexes can now be defined only at the region level without requiring individual hex files. The web app automatically generates synthetic hex data for these hexes, inheriting terrain and biome from the region.

  **New Features:**
  - API endpoint `/api/hexes.json` includes synthetic hexes from regions
  - Individual hex pages (`/session-toolkit/hexes/[id]`) render region-only hexes
  - Hex catalog includes synthetic hexes in listings
  - Region hex pages show all hexes including those without files

  **New Utilities:**
  - `createSyntheticHex(hexId, regionData)` - creates minimal hex data from region defaults
  - `resolveHexWithRegion(hex, region)` - applies region fallbacks for terrain/biome
  - `getAllRegionHexIds(regions, notation)` - gets all hex IDs referenced by regions

  Synthetic hexes display as "Unexplored" with the landmark "This area has not yet been explored."

- f9c62ce: Spike: Text conditional registration of content collections

### Patch Changes

- 3b23d23: Add lair actions support to stat blocks

  **Schema:**
  - Add `lair_actions_intro` field for introductory text (e.g., "On initiative count 20, roll 1d4")
  - Add `lair_actions` array field with `name` and `desc` for each lair action

  **Web App:**
  - New `LairActions.astro` component to display lair actions in stat blocks
  - Lair actions render after reactions when present

- 6600365: Miscellaneous UI fixes and improvements

  **Badge Component:**
  - Fix inconsistent font weight by setting explicit `font-weight: normal`
  - Add explicit font family for consistent rendering

  **Sidebar Navigation:**
  - Make nav menu scrollable when content exceeds viewport height
  - Move scrollbar to edge of sidebar (outside padding)
  - Add theme-aware scrollbar styling for both light and dark modes

  **GM Dashboard:**
  - Add in-world game start date display to next session agenda

  **Hidden Sites:**
  - Fix type errors when clue references are objects instead of strings
  - Use `normalizeClueRef` helper for consistent handling

  **Minor Fixes:**
  - Fix navbar nag badge font consistency
  - Fix hex detail content spacing
  - Update progress meter font

- 52429bd: Update default encounter table

## 3.6.0

### Minor Changes

- 27cb4de: **Content Update:** Update tags and other metadata on clues
- 5b88e60: **Content Update:** Complete remaining nodes for the Skyspire
- ca2aec9: **Content Update:** Revise "Iron Basilica" dungeon
- 41550c1: **Content Update:** Add more nodes to the Skyspire
- a973ad4: **Content Update:** Add new rules and articles
- dc73bc5: **Content Update:** Record data from session 22
- cf8c1df: **Content Update:** Add edges for the Skyspire
- f245efb: **Content Update:** Add more Skyspire locations and player handouts
- 6ddfe24: **Content Update:** Update plotline and clues for repairing the Skyspire
- dfeeeac: Expand encounter category tables
  - Allow both description tables and weighted tables
  - **Content Update:** Consolidate all scar site encounter tables into reusable encounter category tables

- 81eeff4: **Content Update:** Add profiles for additional NPCs
- 144be32: **Content Update:** Add clues about the term "Velari"

## 3.5.0

### Minor Changes

- f524d90: **Content Update:** Add details to crystals knowledge tree
- b5bf065: Curate/audit clues:
  - Add links and displays
  - **Conent Update:** Remove unused clues, place remaining clues
- 3ce30cd: **Content Update:** Add dungeons for region 16
- f83daea: Add GM dashboard
- 4978f44: **Content Update:** Add "herald encounters" for regions
- 493e50a: Improve Clue UI
- 1eb7800: **Content Update:** Migrate knowledge trees to clues
- 7eb674e: Add new information architecture for clues
- 44022a0: **Content Update:** Add initial plotlines
- ec7e954: Clean up and prune dead and deprecated code
  - @skyreach/data: Update repo paths
  - @skyreach/schemas: **BREAKING CHANGE:** Remove deprecated schemas
  - @skyreach/web: Remove dead code
- c789750: Remove "objectives" knowledge tree and replace with checklist article
- cf61dca: **Content Update:** Refactor clues and plotlines to new format
- 947e5b1: **Content Update:** Update dungeon in L15
- 89c8f82: **Content Update:** Build out region 29
- e213690: Persist filter state in URL query parameters
- 0b6649c: - **BREAKING CHANGE:** Remove deprecated fields `vegetation` and `elevation` from hex schema
  - **Content Update:** Remove explicit `elevation` field and use free text `topography` field instead
- b2ac14c: **Content Update:** Update floating clues that have been placed
- b4c3ce8: **Content Update:** Change medium for records in Ocularium Sextus
- d0666e8: Refactor badges to use a shared component

## 3.4.0

### Minor Changes

- 91b7478: Expand encounter taxonomy and cross-referencing
- 2a27e3d: Add an index page to list all knowledge trees
- 6a734eb: Refactor the knowledge tree viewer to display just one node at a time
- ef14220: **Content Update:** Add new creatures and encounters
- 98ead0b: Add components for viewing pointcrawls
- 934bdd5: Add pointcrawl rules
  - Expand pointcrawl node schema to include light sources
  - **Content Update:** Add pointcrawl rules
- a8e02cf: **Content Update:** Add content for region 15
- 3957613: **Content Update:** Record session 21; fix CLI bugs
- 0712fd6: Minor updates:
  - Add optional flag ot hide random encounters for a specific hex
  - **Content Update:** Add locations and connections for the Skyspire deck 1
- dd8d2c0: **Content Update:** Add locations and passages for deck 2
- d844fc0: **Content Update:** Add random encounters for Skyspire
- 62d635b: **Content Update:** Place some knowledge nodes for the Skyspire
- 0fff456: **Content Update:** Add & expand articles on crystals; add & expand Skyspire knowledge trees
- c2afc28: **Content Update:** Add pointcrawl locations and connections for the Skyspire base station
- 7bcc551: Add spell collection and new spells
  - Add spell schema to `@skyreach/schemas`
  - Add spell catalog to `@skyreach/web`
  - **Content Update**: New spells added to the spell catalog
- dd832d6: Create reusable card and card grid components
- fd19378: **Content Update:** Record results of the _Winter of 1512_ minigame
- e0820d9: **Content Update:** Add worldbuilding articles on materials and architecture for both F.C. and Dragon Empire

### Patch Changes

- 98eace4: Refactor `KnowledgeTree` component for better display alignment

## 3.3.0

### Minor Changes

- c54fe00: Update and expand hidden sites schema
  - Add new hidden site sources
  - **Content Update:** Add hidden sites based on clues and faction leads
- 416f5dd: **Content Update:** Add new guidelines for awarding Advancement Points
- 648c3d2: Add light/dark mode toggle; improve map naviagtion
- c8ebbab: **Content Update:** Add an outline for the Dragon Empire
- 9e92518: Add encounter taxonomy and filtering
- 24b6f34: **Content Update:** Update encounters and dungeons
- 72a2ade: **Content Update:** Add details for region 18
- 468d136: **Content Update:** Remove duplicate encounters
- e3ef0c9: Made the side nav menu and article routes configurable from YAML rather than hard-coded into the web app's logic. This allows for easier updates and customization of the navigation structure without needing to modify the application code directly.
- e56f556: **Content Update:** Update list of factions

### Patch Changes

- 5fe6daa: Clean up and unify logic around rendering the "explored" checkbox

## 3.2.0

### Minor Changes

- 899d5d6: Dockerize web app for deployment
- 3705dce: **Content Update:** Add updates for session 20
- ba9d99f: **Content Update:** Update styles and layouts

### Patch Changes

- d8696db: Configure web app for deployment to Railway

## 3.1.0

### Minor Changes

- 86ff396: **Content Update:** Add new articles on bearfolk culture; add outline on alseid culture
- 7cf8436: Expand roleplay books:
  - Add new data type
  - **Content Update:** Expand roleplay books for various cultures and species, including addition of "intelligence reports"
- 32e7ef4: **Content Update:** Expand existing Revenant Legion encounters to include new troop types
- 79b6907: Add additional Revenant Legion creature types:
  - Add display of bonus actions and reactions to stat blocks
  - **Content Update:** Add and revise Revenant Legion creature types
- 4deb45c: **Content Update:** Add stat blocks and tier 2 encounters
- 5177911: Update encounter schema to support content from external markdown file
- 5a83b39: **Content Update:** Update random encounter tables
- fa083d7: **Content Update:** Add encounters and floating clues for intel reports
- eadd665: **Content Update:** Added everything for the "Winter 1512" mini-game

## 3.0.0

### Major Changes

- a798ced: Breaking **content** change! Update rules for:
  - trail formation and decay
  - weather generation
  - daylight and exhaustion envelopes

### Minor Changes

- 70a2fc7: Hide retired characters in AP status and progress tracker
- 20630f5: Wire web app to read character AP from AP ledger

### Patch Changes

- 4e2c992: Fix type errors; fix bug with "Explored" checkbox in interactive map's detail pane
- ca23cfc: Fix time schemas
  - explicitly name fields
  - store segments everywhere
  - migrate old logs
- ec8befc: Implement scribe fast-travel command
- 0ce7421: Add logs for session 19
- b30babe: Backfill session logs

## 2.4.1

### Patch Changes

- 65916d2: Add `SessionId` branded type; add `scribe start` interactive mode

## 2.4.0

### Minor Changes

- e569fa1: Move Astro website and CLI tool from repo root to monorepo app
- 094179e: Add release automation
- 188c649: Add GitHub Action to ensure there's a changeset for every new PR

### Patch Changes

- 2552397: Update linting and formatting rules

# @skyreach/web

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

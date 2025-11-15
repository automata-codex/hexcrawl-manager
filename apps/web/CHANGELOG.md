# @skyreach/web

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

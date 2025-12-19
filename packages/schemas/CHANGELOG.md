# @skyreach/schemas

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

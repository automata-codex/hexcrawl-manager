# @skyreach/data

## 4.1.0

### Minor Changes

- 2287096: Make scribe's `fast` command usable for real multi-day journeys: one command
  walks the party along the whole trail route, auto-advancing days and weather,
  rolling per-hex encounter chances from hex/region data, and pausing in-hex for
  the GM to roll encounters manually. Implements
  `docs/plans/19-fix-fast-travel.md`.

  **CLI** (`@achm/cli`):
  - **Multi-day travel** — new `driveJourney` orchestrator wraps the pure
    single-day runner: when a day fills up it emits `day_end`/`day_start`,
    recomputes the daylight envelope from the new date (season-aware, so a
    trip crossing e.g. winter→spring picks up the longer days), and continues
    the route. A leg that can't fit even a fresh full day stops with a clear
    "stalled" error instead of looping; a partially-used opening day rolls
    into a fresh one first.
  - **Auto-weather** — every travel day gets rolled-and-committed weather (the
    same 2d6 + forecast pipeline as interactive `weather roll`/`commit`, taken
    as-is with no overrides), including day 1 when the GM hasn't committed any.
    Forecast chains day-to-day, and bad-weather travel doublers now apply on
    any day of the trip. GM-committed day-1 weather is left untouched.
  - **Per-hex encounter chance** — occurrence now uses the d20 threshold from
    the hex being entered (`hex.encounterChance`), falling back to the hex's
    region (`region.encounterChance` via the region's `hexes` membership list),
    else 0/never with a warning. Replaces the old hardcoded 5% (`roll === 1`).
    Note: typical region values (6–8) mean far more frequent encounters on
    multi-hex trips than before.
  - **Prompt-to-roll encounters** — on a hit, the party travels INTO the hex
    (move + time logged), a note prompts the GM to roll on the region table,
    and travel pauses there. Fast travel no longer auto-picks a monster and no
    longer reads `default-encounter-table.yaml`.
  - **Tolerant resume** — `fast resume` now verifies only the party's position
    (at the pause hex, normalized comparison) instead of an exact log hash, so
    resolving an encounter, adding notes, or day changes no longer invalidate
    the plan. Fixes two latent bugs: the old hash gate compared against a field
    Zod stripped on load, so resume was _always_ "stale"; and the old
    pause-before-entering order re-rolled the same hex's encounter check on
    every resume.
  - **`abort` clears the plan** — the top-level session `abort` now deletes any
    fast-travel plan tied to the session (previously only `fast abort` did).
  - **Status/help polish** — `fast status` shows the real exhaustion cap
    (24 segments / 12h, was 16 / 8h) plus the day's season-derived daylight
    envelope; help text describes the multi-day flow and encounter pause.
  - **Pruned dead code** — encounter-table auto-roll machinery
    (`loadEncounterTable`, `rollEncounterType`, `rollEncounterEntry`,
    `weightedRandomSelection`), `computeSessionHash`, the plan's
    hash/seq/weather-flag fields, the unused `paused_stale` status, and the
    unused `daylightCapSegments` arg to `executeLeg`. Existing plan files load
    fine (obsolete keys are stripped).

  **Data** (`@achm/data`):
  - New `REPO_PATHS.REGIONS` (`data/regions/`), used to build the hex→region
    encounter-chance index.

### Patch Changes

- 33fbc84: Surface live anchored beats in scribe, alongside hex arrival alerts. When the
  party reaches a hex whose landmark or hidden sites anchor a live plotline beat
  (via `landmark.beats` / `hiddenSites[].beats`), the interface announces it on a
  separate, labeled line — count-only, e.g. `🎭 1 live beat(s) anchored here —
see hex j7.`
  - **move / backtrack**: the beat line prints after the move, beside any clue
    or update lines.
  - **fast travel**: a live beat counts as an arrival alert, so a flagged
    mid-route hex pauses the journey there (existing `paused_hex_alert` path);
    a note is written to the session log. A beat anchored on several intervening
    hexes surfaces on each. The destination completes instead of pausing, as
    with clues.

  "Live" means the beat's `PlotlineBeatStatus` is `pending` or `active` (and
  `campaignStatus: active`); `resolved` and `skipped` are terminal and suppressed.
  Beat statuses are cached per process. Surfacing is display-only — nothing writes
  to the data repo.

  `@achm/data`: added `loadBeats()` / `parseBeatFile()` (reads plotline beat
  frontmatter into `BeatData` keyed by canonical `plotlineSlug/beatSlug`) and
  `REPO_PATHS.PLOTLINES`. The hex→beat anchor validator now resolves IDs through
  this shared loader instead of its own frontmatter parsing.

- 371cf30: Surface hex arrival alerts in scribe: when the party reaches a hex that has
  unknown clues (referenced by its landmark, hidden sites, or GM dream-notes)
  or pending text in its `updates` field, the interface announces it —
  count-only, e.g. `🔍 2 unknown clue(s) here — see hex E7.` / `📝 This hex
has 1 GM update(s).`
  - **move / backtrack**: the alert lines print after the move.
  - **fast travel**: entering a flagged mid-route hex pauses the journey there
    (new `paused_hex_alert` status, same lifecycle as the encounter pause —
    progress is saved and `fast resume` continues at the next leg without
    re-checking the flagged hex). A note is also written to the session log.
    When the flagged hex is the destination itself the journey completes
    instead of pausing, and the alerts print with the arrival message. If a
    hex triggers both an alert and an encounter, the journey pauses once
    (encounter status) and both notes land in the log.

  "Unknown clue" means `status: unknown` + `campaignStatus: active`; clue
  statuses are cached per process. Alerts are display-only — nothing writes to
  the data repo; the GM clears `updates` by hand once narrated.

  `@achm/data`: added `REPO_PATHS.CLUES`.

- 68bd40b: Link roleplay books to hexes, adding _place-arrival_ as a second surfacing
  trigger for books (alongside the existing encounter-page surfacing). A hex
  feature can now remind a roleplay book via `landmark.roleplayBooks` /
  `hiddenSites[].roleplayBooks` (bare book slugs, e.g. `fort-dagaric`). The link is
  one-directional — "which hexes remind this book" is derived by querying hexes.
  Books are surfaced whole, as a pointer: the reminder names the book, never its
  contents.
  - **Schema (`@achm/schemas`)**: optional `roleplayBooks` array on `LandmarkSchema`
    and `BaseHiddenSiteSchema` (so all three hidden-site variants inherit it),
    mirroring the `beats` field.
  - **Data (`@achm/data`)**: `loadRoleplayBooks()` / `parseRoleplayBookFile()` (reads
    `data/roleplay-books/*.yml` into `RoleplayBookData` keyed by file slug) and
    `REPO_PATHS.ROLEPLAY_BOOKS`. The hex-reference validator now also checks
    `roleplayBooks` anchors through this loader.
  - **Web (`@achm/web`)**: the hex detail page lists linked books (title + link)
    beside clues/beats, and the interactive-map detail panel shows them too. Book
    data is resolved GM-side only — the `/api/hexes.json` GM branch attaches it and
    player payloads never carry it.
  - **CLI (`@achm/cli`)**: on `move`, `backtrack`, and fast-travel arrival, scribe
    announces linked books on a separate labeled line, naming the title — e.g.
    `📖 Roleplay book(s) relevant here: Fort Dagaric — see hex v17.` A linked book
    counts as an arrival alert, so a flagged mid-route hex pauses fast travel there
    (existing `paused_hex_alert` path) and a note is written to the session log.
    Unlike beats, books carry no status gate — every linked, resolvable book
    surfaces. Book titles are cached per process; surfacing is display-only.

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

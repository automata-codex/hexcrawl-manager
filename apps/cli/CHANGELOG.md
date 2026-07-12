# @skyreach/cli

## 2.10.0

### Minor Changes

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

- d03067e: Two tweaks to scribe's `fast` travel, after more sessions at the table:
  - **Log every encounter check**: fast travel now emits a new `encounter_check`
    event (`hexId`, `threshold`, `roll`, `triggered`) for every d20 roll against
    a hex's encounter chance, not just the ones that trigger. `rollEncounterOccurs`
    returns the raw roll (`null` when threshold <= 0, i.e. no die was rolled)
    alongside whether it triggered, so the actual result is available for
    diagnostics even on a miss.
  - **Pause on day rollover for a campfire card**: a multi-day journey that rolls
    into a new day (camp made, day ended/started, weather rolled) now stops
    there with a new `paused_day_rollover` status and a `🔥 Time for a campfire
card!` reminder, instead of auto-advancing straight through to the next leg.
    `fast resume` picks the route back up from the parked hex. The plain `day`
    command (outside of fast travel) prints the same reminder when a day ends.

- 688b0ac: Pause scribe's `fast` travel on keyed encounters: when the party enters a
  route hex with a `keyedEncounters` entry that triggers on entry, the journey
  stops there so the GM can run the scripted encounter, then continues with
  `fast resume`.
  - **Entry only**: only `trigger: entry` keyed encounters apply — `trigger:
exploration` ones are found by searching a hex, which fast travel doesn't
    do, so they're ignored.
  - **Lifecycle**: same as the encounter / hex-alert pauses (new
    `paused_keyed_encounter` status) — progress is saved and `fast resume`
    picks up at the next leg without re-triggering the keyed hex. A note naming
    the encounter id(s) is written to the session log.
  - **Destination**: a keyed encounter on the final hex completes the journey
    rather than pausing (no legs remain); it's surfaced in the arrival summary.
  - **Precedence**: when a hex fires several signals at once, every note still
    lands in the log, but the journey pauses once, preferring the most
    actionable status — keyed encounter > random encounter > hex alert.

- 5853283: Three tweaks to scribe's `fast` travel, after the first session using it at the table:
  - **Camp hex on day rollover**: when a multi-day journey rolls into a new day,
    the rollover line now names the hex the party camps in, tagged with a ⛺ so
    it's easy to spot — e.g.
    `Day rolled over → 16 Hibernis 1 (winter), weather: pleasant ⛺ Camp: P14`.
  - **Show every trigger on a hex**: when a hex fires more than one thing at once
    (e.g. a random encounter _and_ a pending GM update), the pause / arrival
    summary now lists them all instead of only the one that set the pause status.
    Keyed encounters and alerts are re-derived from hex data; the random encounter
    roll is carried on the run result (`randomEncounterTriggered`) so it's
    surfaced even when a keyed encounter takes precedence for the status.
  - **`--no-rec` flag**: `fast <dest> <pace> --no-rec` and `fast resume --no-rec`
    skip the per-hex random encounter check (REC) for the whole journey. Keyed
    encounters and hex alerts still fire — only the random d20 roll is suppressed.
    The flag can appear in any position and is per-invocation (not stored on the
    plan), so pass it again on `fast resume` to keep REC off.

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

- 344be42: Report milestone **AP** (not award counts) in the `weave status ap` milestone
  table. The section is now labeled `Milestone AP:` and its Eligible / Claimed /
  Unclaimed columns show advancement points rather than counts of milestone
  awards.
  - **Claimed** is the sum of the character's `milestone_spend` ledger deltas
    (combat + exploration + social), mirroring how the per-pillar AP table already
    aggregates them — replacing the previous "one per ledger entry" count.
  - **Eligible** is the sum of per-session top-ups
    (`max(0, MILESTONE_AP_CAP − sessionTotal)`) across the milestone-bearing
    sessions the character attended, reading each `sessionTotal` from their
    `session_ap` ledger entries. The cap is per session, so multiple milestone
    events in one session collapse to a single top-up. Sessions whose pillar AP
    hasn't been applied yet have no computable top-up and default to the full cap
    (3), self-correcting once `weave apply ap` runs.
  - **Unclaimed** is `max(0, eligible − claimed)`, now in AP.

  The `MILESTONE_AP_CAP` constant moves to `weave/lib/core/milestone-ap.ts` (a
  shared `lib/core` home; `allocate-ap-milestone.ts` re-exports it) so the status
  computation can use it without a command→command import. Allocation, apply, the
  ledger schema, and the per-pillar "AP Status by Character" table are unchanged.

### Patch Changes

- Updated dependencies [1005138]
- Updated dependencies [a5d6576]
- Updated dependencies [43d7bbc]
- Updated dependencies [33fbc84]
- Updated dependencies [a628881]
- Updated dependencies [217b2ec]
- Updated dependencies [b59a23c]
- Updated dependencies [a5e22fa]
- Updated dependencies [d03067e]
- Updated dependencies [24705c7]
- Updated dependencies [2287096]
- Updated dependencies [371cf30]
- Updated dependencies [e711905]
- Updated dependencies [68bd40b]
- Updated dependencies [53b5071]
- Updated dependencies [ec09103]
- Updated dependencies [346ceb9]
- Updated dependencies [c505a5e]
- Updated dependencies [95552f5]
- Updated dependencies [cda9ba0]
- Updated dependencies [461e87c]
  - @achm/schemas@6.0.0
  - @achm/core@4.1.0
  - @achm/data@4.1.0

## 2.9.0

### Minor Changes

- 630e38e: Replace the flat-3 milestone-grant model with a top-up model and split the
  `weave allocate ap milestone` workflow into staging + apply phases.

  **Behavior change:** A milestone now fills the gap between a character's
  session pillar AP and a per-session cap of 3 AP. Pillar AP earned through
  normal play is credited first; the milestone tops up the remainder. This
  matches the campaign rules in the players guide. The `MILESTONE_AP_AMOUNT = 3`
  constant has been removed; the new constant `MILESTONE_AP_CAP = 3` represents
  the per-session cap, not a fixed grant.

  **Workflow change:** `weave allocate ap milestone` no longer writes to the AP
  ledger. Instead it stages an entry in the target session report's
  `milestoneAllocations[]` array. `weave apply ap` is now the single writer for
  both `session_ap` and `milestone_spend` ledger entries, reconciling staged
  allocations against the per-character session pillar AP at apply time. This
  gives natural order-independence — pillar AP and milestone allocation can
  happen in either order and `apply` reconciles them.

  **Schema (`@achm/schemas`):**
  - Add `MilestoneEventSchema` (a structured `milestone` scribe event with
    `{ note, slug? }` payload). Replaces the legacy `todo` event with the
    `"Add AP for milestone:"` text prefix.
  - Add `MilestoneAllocationSchema` and the `milestoneAllocations[]` field on
    `SessionHeader` (parallel to `absenceAllocations[]`).
  - `MilestoneSpendEntrySchema.sessionId` semantics updated: it now refers to
    the session the milestone is tied to, not "where the entry was applied."

  **CLI (`@achm/cli`):**
  - `scribe ap milestone "<note>"` now emits a structured `milestone` event.
  - `weave allocate ap milestone` requires `--session-id`, accepts pillar
    splits summing 0..3 (was strict =3), eagerly validates against existing
    `session_ap` when present, and stages intent in the report.
  - `weave apply ap` adds Phase 2: reads `report.milestoneAllocations[]`,
    computes per-character topup from the just-written `session_ap`, strict-fails
    on mismatched sums, and appends `milestone_spend` ledger entries.
  - `weave status ap` adds a Milestone Awards table mirroring Unclaimed Absence
    Awards.

  **Breaking change:** `weave allocate ap milestone` no longer commits to the
  ledger directly. Existing `milestone_spend` entries written under the
  previous model continue to display correctly, but new allocations require
  running `weave apply ap` to commit. See
  `docs/specs/milestone-ap-reconciliation.md` for the full design and
  `docs/plans/milestone-ap-reconciliation-implementation.md` for the migration
  runbook.

### Patch Changes

- 1d4ea03: Align AP spec docs and a stale code comment with the rules of record and
  the actual implementation.
  - **Absence credits are not Tier-1-only.** The rules article
    (`character-advancement.md`) grants 1 absence AP per missed session to
    every absent character regardless of tier, and the implementation
    (`compute-unclaimed-absence-awards.ts`, `allocate-ap.ts`) has always
    matched. Only the spec docs claimed Tier-1 was a precondition. Removed
    the stale restriction from `ap-workflow-overview.md` (§3.E, §3.F, §6,
    §7, §9, §11) and `weave-commands/allocate-ap.md` (§1, §4, §5, §6, §9,
    §10, §11), plus a stale "Tier-1 credits" comment in
    `allocate-ap.ts`.
  - **Pillar splits are player-chosen, not GM-chosen.** Per the rules of
    record, each player decides how to allocate their character's milestone
    topup and absence credit across pillars. The spec docs and migration
    runbook called these decisions GM judgment; corrected to reflect that
    the GM is the CLI operator who types in values supplied by each player.
    Updated `milestone-ap-reconciliation.md`, `ap-workflow-overview.md`,
    the implementation plan, and the migration runbook.

  No behavior change.

- Updated dependencies [6d0da96]
- Updated dependencies [8cd786e]
- Updated dependencies [630e38e]
  - @achm/schemas@5.1.0

## 2.8.0

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

- 0c99f12: Rename package namespace

### Patch Changes

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

- Updated dependencies [ec425a4]
- Updated dependencies [52b773f]
- Updated dependencies [3d0d8ba]
- Updated dependencies [3b23d23]
- Updated dependencies [8726d51]
- Updated dependencies [0c99f12]
- Updated dependencies [0f0d0f7]
- Updated dependencies [87fad0b]
- Updated dependencies [2252ac4]
- Updated dependencies [8ea782e]
  - @achm/core@4.0.0
  - @achm/schemas@5.0.0
  - @achm/data@4.0.0
  - @achm/test-helpers@3.1.0
  - @achm/cli-kit@3.1.0

## 2.7.0

### Minor Changes

- f83daea: Add GM dashboard

### Patch Changes

- Updated dependencies [f83daea]
- Updated dependencies [4978f44]
- Updated dependencies [7eb674e]
- Updated dependencies [ec7e954]
- Updated dependencies [89c8f82]
- Updated dependencies [0b6649c]
  - @skyreach/schemas@4.0.0
  - @skyreach/data@3.3.0
  - @skyreach/core@3.1.0

## 2.6.2

### Patch Changes

- 3957613: **Content Update:** Record session 21; fix CLI bugs
- Updated dependencies [91b7478]
- Updated dependencies [934bdd5]
- Updated dependencies [31a2356]
- Updated dependencies [0712fd6]
- Updated dependencies [d844fc0]
- Updated dependencies [7bcc551]
  - @skyreach/schemas@3.3.0

## 2.6.1

### Patch Changes

- 385eaa3: Fix bugs in fast travel command
- Updated dependencies [c54fe00]
- Updated dependencies [9e92518]
- Updated dependencies [72a2ade]
- Updated dependencies [e3ef0c9]
  - @skyreach/schemas@3.2.0
  - @skyreach/data@3.2.0

## 2.6.0

### Minor Changes

- e0d25c5: Add hex processing to `weave apply`
- 70a2fc7: Hide retired characters in AP status and progress tracker
- dac07dd: Add more scribe commands
- ca23cfc: Fix time schemas
  - explicitly name fields
  - store segments everywhere
  - migrate old logs
- 39e37e8: Minor updates:
  - BREAKING CHANGE: Move `rollDice` to from @skyreach/data to @skyreach/core
  - Update `scribe move` to display a reminder when moving along permanent trails
- ec8befc: Implement scribe fast-travel command
- b30babe: Backfill session logs
- 20630f5: Wire web app to read character AP from AP ledger

### Patch Changes

- 4e2c992: Fix type errors; fix bug with "Explored" checkbox in interactive map's detail pane
- d790497: Update callsites to accept new or old form of session filename
- Updated dependencies [e0d25c5]
- Updated dependencies [ca23cfc]
- Updated dependencies [39e37e8]
- Updated dependencies [d790497]
- Updated dependencies [ec8befc]
- Updated dependencies [b30babe]
- Updated dependencies [20630f5]
  - @skyreach/schemas@3.0.0
  - @skyreach/data@3.0.0
  - @skyreach/test-helpers@3.0.0
  - @skyreach/core@3.0.0
  - @skyreach/cli-kit@3.0.0

## 2.5.0

### Minor Changes

- 3f9dc1b: Implement `weave allocate ap` command
- 99a55f6: Update and expand `scribe doctor` command
- cbfd8ed: Update tests with fixture factories
- ba92ccf: Add more tests; switch to custom prompts for interactivity in `scribe` tool
- 65916d2: Add `SessionId` branded type; add `scribe start` interactive mode
- feeb18e: Improve and test discovery for `weave apply`.
- ba530e6: Update `scribe finalize` per spec
- fee59a4: Update `scribe` tests; add GitHub Action ti run tests on every PR
- ba78e1e: Update `session` command (removing call to deprecated function)
- 933be02: Add support for `meta.yaml` v2
- 1dc8e05: Update `weave apply trails` to match spec
- fb47a9e: Update `weave plan` command

### Patch Changes

- 06c8020: Refactor file layout
- Updated dependencies [3f9dc1b]
- Updated dependencies [cbfd8ed]
- Updated dependencies [ba92ccf]
- Updated dependencies [65916d2]
- Updated dependencies [feeb18e]
- Updated dependencies [ba530e6]
- Updated dependencies [fee59a4]
- Updated dependencies [933be02]
  - @skyreach/test-helpers@2.5.0
  - @skyreach/data@2.5.0
  - @skyreach/schemas@2.5.0
  - @skyreach/core@2.5.0
  - @skyreach/cli-kit@2.5.0

## 2.4.0

### Minor Changes

- 062f7fa: Add `scribe` and `weave` CLI tools
- 56f881b: Refactor AP ledger file to use JSONL format
- 71168aa: Add `weave ap status` command
- 7f491a3: Migrate `weave ap apply` to `weave apply ap`
- 1fbb9ef: Migrate `weave apply trails` to new command structure
- ad6b2d2: Add prompts to `@skyreach/cli-kit` and move existing functionality to shared CLI services
- c7a19f4: Migrate helpers and shared functions from the CLI to shared packages
- 188c649: Catch-up changeset for the CLI tools we've been adding
  - The `scribe` REPL for capturing a session log
  - The first `weave apply` command for updating the trails and handling a season rollover
  - The `session` command to bootstrap a planned session report
- 40823fc: Generate package catalog from typdoc annotations
- 188c649: Add `skyreach weave ap apply` command
- bf73d6e: Migrate `weave ap status` to `weave status ap`

### Patch Changes

- fcfd1f4: Add error checking to the `weave apply trails` loop
- 2552397: Update linting and formatting rules
- Updated dependencies [56f881b]
- Updated dependencies [71168aa]
- Updated dependencies [7f491a3]
- Updated dependencies [1fbb9ef]
- Updated dependencies [ad6b2d2]
- Updated dependencies [c7a19f4]
- Updated dependencies [8ea1ad4]
- Updated dependencies [2552397]
  - @skyreach/schemas@2.4.0
  - @skyreach/data@2.4.0
  - @skyreach/test-helpers@2.4.0
  - @skyreach/cli-kit@2.4.0
  - @skyreach/core@2.4.0

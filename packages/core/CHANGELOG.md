# @skyreach/core

## 4.1.0

### Minor Changes

- 1005138: Promote beats from inline plotline data to a first-class content type, add
  the at-the-table beat index, and link nobles to their NPC entries.
  Implements `docs/plans/beat-entity-type.md` and Phase 2 of
  `docs/plans/beat-tags-and-filterable-index.md` (Phase 1, the optional
  `tags` field, shipped via the `beat-tags-field` changeset).

  **Schema** (`@achm/schemas`):
  - **New** `BeatSchema` (`src/schemas/beat.ts`) — a beat's own file. Fields:
    `slug`, `title`, `plotline` (parent plotline slug, redundant with the
    file path but explicit for validation/reverse-lookup), `status` (reuses
    `PlotlineBeatStatusEnum`, defaults `'pending'`), optional `trigger`,
    `factions`, `npcs`, `tags`, `clues` (existing `ClueReferencesSchema`),
    and `campaignStatus` (defaults `'active'`). Exported from the package
    barrel.
  - **`PlotlineSchema` reshape:**
    - `beats: PlotlineBeatSchema[]` → `beats: string[]` (ordered bare beat
      slugs into the new `beats` collection). The array order is the
      canonical sequence; the per-beat content moves out of the plotline
      file.
    - **Removed** `PlotlineBeatSchema` and its `PlotlineBeatData` type.
      `PlotlineBeatStatusEnum` stays — `BeatSchema` reuses it.
    - **New** optional `blurb: string` field — short card-only summary
      shown on the plotlines index when set, with `summary` as the
      fallback.
  - **`NobleSchema`:** new optional `npcId: string` linking a noble to the
    corresponding NPC entry. When set, the noble's name links to the NPC
    page on both the nobility index and within the hierarchy tree.

  **Core** (`@achm/core`):
  - `resolveBeats(beats[], lookups)` → `resolveBeat(beat, lookups)`. The
    resolver now operates on a single standalone beat rather than an
    inline array. Result type renamed `ResolvedBeat` → `ResolvedBeatEntity`
    and now carries `slug` and `plotline` (the parent plotline slug). The
    `notes` field is dropped — beat notes are the markdown body of the
    beat file now, rendered by `<Content />` on the detail page rather
    than the resolver. Shared `ResolvedRef`, `ResolvedClueRef`, and
    `BeatLookups` types are unchanged.

  **Web** (`@achm/web`):
  - **`beats` content collection** (`src/content.config.ts`) — globs
    `*/beats/*.{md,mdx}` under `DIRS.PLOTLINES`, gated by the same
    `collectionHasContent` check used for plotlines. The `plotlines`
    collection's glob narrows from `**/*.{md,mdx}` to `*/*.{md,mdx}` so
    per-plotline `beats/` subdirectories aren't picked up as plotlines.
  - **Beat detail page** (`/gm-reference/plotlines/[plotline]/beats/[beat]`)
    renders the standalone beat: title, parent-plotline link, status
    badge, trigger, faction/NPC/clue lists (with `(not found)` fallback
    for unresolved refs), and the markdown body via `<Content />`. Uses
    `SecretLayout`.
  - **`PlotlineBeats.astro` → `PlotlineBeatList.astro`.** The verbose
    inline beats component is replaced with a compressed one-row-per-beat
    list driven by `plotline.beats` (now reference slugs) looked up
    against the beats collection. Each row links to the beat detail page;
    resolved beats are visually de-emphasized but not hidden. Missing
    references render an inline "(missing: `<slug>`)" marker rather than
    crashing. Companion `PlotlineBeatList.types.ts` keeps the row props
    type stable.
  - **`/session-toolkit/beats/` index** — new filterable list mirroring
    the clue index. Filters (all URL-synced): free-text search across
    title and trigger; tag (primary axis); faction (with `__none__` for
    unaffiliated); NPC; plotline; status (`pending`/`active`/`resolved`/
    `skipped`); show-inactive toggle. Rendered by the new
    `BeatList.svelte` (Svelte 5 runes, modeled on `ClueList.svelte`).
  - **Plotlines index** uses the new `blurb` field on cards (falling back
    to `summary`) and switches its sort from raw `localeCompare` to
    `sortIgnoringArticles` so "The …" plotlines sort by their content
    word.
  - **Nobility pages link to NPCs.** Both the alphabetical nobility list
    and the `NobleHierarchy` tree render the noble's name as a link to
    `getNpcPath(npcId)` when `npcId` is set, plain text otherwise.
  - **Beats count as clue placements.** `clue-usage-tracker.ts` gains a
    `'beat'` variant on `ClueUsageReference` (carrying `plotlineSlug` so
    the URL can be reconstructed) and a new pass that scans every beat's
    `clues` array. Beat placements show up in the clue's usage list
    alongside encounter / hex / NPC / etc. placements; clicking through
    lands on the beat detail page. The `plotlines` parameter on
    `buildClueUsageMap` is now used to resolve display names for the beat
    placement labels (it remains non-scanning for plotline files
    themselves).
  - **Validators:**
    - `plotline-refs-analyzer.ts` / `validate-plotline-refs.ts` gain three
      new warning kinds (`missing-beat-file`, `orphan-beat`,
      `beat-plotline-mismatch`) covering: a slug in `plotline.beats` with
      no matching beat file, a beat file not listed in its parent's
      `beats` array, and a beat whose frontmatter `plotline` doesn't
      match its directory.
    - `validate-nobles.ts` checks that every `noble.npcId` points to a
      real NPC.
  - **Migration script** (`scripts/one-time-scripts/migrate-plotline-beats.ts`)
    — one-shot tool that reads every plotline's inline `beats` array and
    emits `<DATA>/plotlines/<plotline>/beats/<slug>.md` files plus
    populates each plotline's `beats: string[]` reference array. Plan →
    validate → write atomic; nothing is written unless every plotline
    validates. Idempotent re-runs are not a goal — this runs once against
    the data repo and is then retired. Field names (`factions`, `notes`,
    etc.) are preserved verbatim during extraction; reconciliation against
    `BeatSchema` is a separate step.

- a628881: Surface per-reference clue discovery context through the reference chain,
  sharpen the beat/clue/encounter schema descriptions, and add an advisory
  clue-placement check.

  **Core** (`@achm/core`):
  - `resolveBeat` now carries the per-reference `context` through to its
    resolved clues. `ResolvedClueRef` gains an optional `context?: string`,
    populated from `normalizeClueRef`, so consumers can show _where/how_ a
    beat's clue is discovered, not just which clue it is. Additive and
    backward-compatible.

  **Schemas** (`@achm/schemas`):
  - Rewrote the top-level `.describe()` on `BeatSchema`, `ClueSchema`, and
    `EncounterSchema` to draw sharp boundaries between the three concepts —
    a beat is a one-time node in a single plotline's arc, an encounter is a
    reusable runnable scene, and a clue is a fact the party can learn.
    Description-only; no field, validation, or type changes.

  **Web** (`@achm/web`):
  - Render the clue discovery `context` wherever clues are listed — encounter,
    NPC, beat, and dungeon detail pages. A page with any contextual clue
    switches to a bulleted list (context shown beneath each clue in italic,
    weak-coloured text); a page with none keeps the compact inline format.
  - Add an advisory `validate:placements` script
    (`scripts/validate-clue-placements.ts`) that reports clues whose placement
    count falls below their `minPlacements` floor. It reuses the web app's
    `buildClueUsageMap` as the single source of truth and always exits 0, so it
    runs in `prebuild` (non-blocking) without ever failing a build.

- a5e22fa: Render region and faction territory outlines on the interactive map.

  **Schemas** (`@achm/schemas`):
  - Add two optional fields to `FactionSchema`. `hexes` is the per-hex territory
    the faction claims; unlike `region.hexes` it is an overlay **claim**, not a
    partition — overlaps across factions are allowed (contested hexes), coverage
    is not exhaustive, and it drives no terrain/biome defaults. `mapColor` is the
    CSS color used to draw that territory's outline on the interactive map. Both
    are additive and backward-compatible; `areaOfOperation` is unchanged.

- 95552f5: Plotline cross-reference standardization. Splits the plotline ↔ NPC /
  faction / character / clue relationships into a coherent set of fields:
  the plotline body remains the source of truth for "who's in this
  plotline," entity files declare which plotlines they appear in for the
  reverse direction, beats become structured, and a new build-time
  validator cross-checks the two directions for drift. Implements
  `docs/specs/plotline-cross-references-spec.md`.

  **Schema** (`@achm/schemas`):
  - **New** `PlotlineBeatSchema` and `PlotlineBeatStatusEnum` (`'pending' |
'active' | 'resolved' | 'skipped'`) with optional `trigger`,
    `factions`, `npcs`, `clues`, and `notes` fields. Added as a new
    optional `beats: PlotlineBeatSchema[]` on `PlotlineSchema`. Array
    order handles intra-plotline sequencing; there is no structured
    dependency field — the `trigger` field captures conditional flavor.
  - **New** optional `plotlines: string[]` field on `FactionSchema` and
    `CharacterSchema`, mirroring the existing `npc.plotlines` field. These
    fields power reverse-direction rendering on the entity pages and feed
    the new validator; the plotline detail page does _not_ derive its
    NPC/faction/character lists from them.
  - **Removed** the unused `clues` field from `PlotlineSchema`. Plotline
    ↔ clue links are authoritative on the clue side (`clue.plotlines`),
    which the plotline detail page already uses to render its linked
    clues. No data files used the removed field.

  **Core** (`@achm/core`):
  - **New** `resolveBeats(beats, lookups)` plus `ResolvedBeat`,
    `ResolvedRef`, `ResolvedClueRef`, and `BeatLookups` types. Pure
    resolver that takes a beats array plus lookup maps for NPCs /
    factions / clues and returns a per-beat structure with each
    reference resolved to `{ id, name, found }` (or
    `{ id, name, found, clueStatus }` for clues). Unknown ids surface as
    `found: false` so callers can render a fallback rather than a broken
    link.

  **Web** (`@achm/web`):
  - **New** `PlotlineBeats.astro` component renders the `beats` section
    on plotline detail pages: heading + status badge per beat, optional
    trigger line, faction/NPC/clue links (reusing the existing
    linked-clue "known" checkmark treatment), notes rendered as markdown.
    Skipped beats render with reduced visual prominence (muted + line-
    through) but are still shown. Unresolved references render as bare
    id text plus a `(not found)` indicator.
  - **Plotline detail page** (`/gm-reference/plotlines/[id].astro`) loads
    NPC / faction / clue collections, builds lookup maps, calls
    `resolveBeats`, and drops in `<PlotlineBeats>`. The existing
    clue-back-reference list (driven by `clue.plotlines`) is unchanged.
  - **New** prebuild validator (`scripts/validate-plotline-refs.ts`)
    cross-checks the entities mentioned in each plotline's body against
    the entities whose own files declare this plotline via `plotlines:`,
    flagging three drift categories per plotline: missing back-references
    (entity in body, not in entity file), stale back-references (entity
    file lists this plotline, body doesn't), and unresolved body
    mentions (a name in the body matches no entity file). Heading
    classification is forgiving — "Operatives at Fort Dagaric" still
    matches the NPC heuristic. Warnings-only by default; set
    `ACHM_STRICT_PLOTLINE_REFS=1` to fail the build. Wired into
    `prebuild.sh`; also runnable as `npm run validate:plotlines`.
  - **Pure analysis core** (`scripts/plotline-refs-analyzer.ts`) split
    out of the CLI entrypoint for unit-testability. Vitest infrastructure
    added to `apps/web` for the first time
    (`apps/web/vitest.config.ts` + a `test` script in `package.json`);
    picks up `scripts/**/*.spec.ts`.
  - **Cleanup:** `clue-usage-tracker.ts` no longer scans
    `plotline.data.clues` (the field is gone); the `plotlines` parameter
    is retained for call-site compatibility. `validate-content-status.ts`
    drops the corresponding plotline → clue check and the
    faction → GM-NPC visibility check (faction pages are GM-only, so
    referencing a GM-only NPC is fine).

### Patch Changes

- Updated dependencies [1005138]
- Updated dependencies [a5d6576]
- Updated dependencies [43d7bbc]
- Updated dependencies [a628881]
- Updated dependencies [217b2ec]
- Updated dependencies [b59a23c]
- Updated dependencies [a5e22fa]
- Updated dependencies [d03067e]
- Updated dependencies [24705c7]
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

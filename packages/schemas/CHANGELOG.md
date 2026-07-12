# @skyreach/schemas

## 6.0.0

### Major Changes

- 346ceb9: **Breaking:** Rename NPC `name` / `title` fields to `displayName` /
  `sortName`, and add optional `factions` / `plotlines` arrays. Requires a
  matching data-repo migration: every NPC YAML must replace its `name`
  (plus optional `title`) with a single required `displayName` (the
  honorific is folded in), and may add `sortName` for sort-by-surname
  behaviour. NPC YAMLs that have not been migrated will fail Zod
  validation at collection load.
  - **Schema** (`@achm/schemas`):
    - Remove `name` (required string) and `title` (optional string).
    - Add `displayName` (required string).
    - Add `sortName` (optional string) — sort key fallback when an NPC's
      displayName starts with an honorific or article.
    - Add `factions` and `plotlines` (optional `string[]`) to support the
      upcoming filterable NPC index.
    - Export `getNpcSortKey(npc)` — single source of truth for NPC sort
      ordering. Returns `sortName ?? displayName`. Use this everywhere NPC
      sort logic touches the schema; do not inline the fallback.
  - **Web** (`@achm/web`): NPC index and detail pages updated to read
    `displayName` instead of `name`/`title`. The honorific subtitle on the
    detail page is removed (the honorific now lives inside `displayName`).
    The existing prose index continues to function with the new fields
    pending its replacement by the filterable index in a follow-up.

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

- a5d6576: Add `beat` as a linkable type for tidings, so a Faction Tiding row
  (rolled or selectable) can link to a beat detail page. The `linkId` is
  the compound `<plotlineSlug>/<beatSlug>`, mirroring the existing
  pointcrawl-node compound-ID pattern.
  - **Schema** (`@achm/schemas`): add `'beat'` to `LinkTypeEnum`. Purely
    additive; existing data continues to validate.
  - **Web** (`@achm/web`):
    - New `getBeatPath(compoundId)` route helper (added in
      `generate-config.ts`, emitted to the generated `routes.ts`) —
      builds off `getPlotlinePath`, exactly as `getPointcrawlNodePath`
      builds off `getPointcrawlPath`.
    - `getLinkPath` resolves `'beat'` links to the beat detail page
      (`/gm-reference/plotlines/<plotline>/beats/<beat>`).
    - `getLinkText` labels beat links as `Beat: <Title>` using the beat
      slug only (the plotline half of the compound ID is omitted from
      the label).

  Authoring: link a tiding row with `linkType: 'beat'` and
  `linkId: '<plotlineSlug>/<beatSlug>'`.

  Deferred (logged, not built): a build-time validator that checks
  `'beat'`-typed `linkId`s contain exactly one `/` and that both halves
  resolve to real content. A malformed compound currently falls through
  to `'#'` silently.

- 43d7bbc: Add optional `tags: string[]` field to `BeatSchema`. Free-form, no
  controlled vocabulary — used as the lookup key for at-the-table beat
  summoning. Existing beat MD files are unaffected; the field is optional
  and additive. Sits alongside the existing `trigger:` field (which stays
  as the GM-facing narrative description of when the beat fires) and the
  other beat metadata.
- 217b2ec: Add visibility + campaign-status fields to content schemas. Additive and
  backward-compatible: existing YAML/MDX files validate unchanged, since
  every new field has a default that matches the current implicit
  behaviour.
  - **New shared fragment** (`packages/schemas/src/schemas/campaign-status.ts`):
    `CampaignStatusEnum` (`'active' | 'inactive'`) and an `isActive(content)`
    helper that defaults to `'active'` when the field is absent.
  - **NPC** gains two fields and a visibility helper:
    - `visibility: 'player' | 'gm'` (default `'player'`) — controls whether
      an NPC appears on player-facing aggregations and detail routes.
    - `campaignStatus: 'active' | 'inactive'` (default `'active'`) — controls
      default-hide filtering on index/list views.
    - `isPlayerVisible(npc)` helper — single source of truth for the
      player/GM check; defaults to `'player'` when the field is absent.
  - **Clue, Encounter, Faction, Plotline** each gain
    `campaignStatus: 'active' | 'inactive'` (default `'active'`). On
    Plotline this coexists with the existing 3-way lifecycle `status`
    (`'active' | 'dormant' | 'resolved'`); on Clue it coexists with the
    existing discovery `status` (`'unknown' | 'known'`). The two axes are
    independent.

  Consumer code (default-hide filtering, visibility gating, build-time
  cross-reference validation) lands in follow-up changesets in the web
  package.

- b59a23c: Enforce that encounter table weights sum to 20.

  GM-facing probabilities for both `mainTable` and tier subtables are displayed
  as `weight / 20` (`RandomEncounterTable.astro`, `TierSubtable.astro`) rather
  than normalized by the actual total, so any list whose weights don't sum to
  20 silently shows the wrong odds. There was previously no enforcement of this
  at the schema level — only a non-blocking UI warning (`validateWeightTotal`),
  and that was wired up for tier subtables only, not `mainTable`.
  - `WeightedCategoryTable` and `TieredSubtableSchema` (`encounter-table.ts`)
    now `.superRefine()` to reject any list whose weights don't sum to exactly
    20, with a message naming the offending tier/table and the actual total.
  - `EncounterOverrideSchema` (`encounter-override.ts`) now reuses
    `TieredSubtableSchema` for its `categoryTables` value type instead of a
    duplicate, unrefined inline record, so hex-level `encounterOverrides` get
    the same enforcement as shared `encounter-category-tables/*.yml` files.

  Verified against all current campaign data (`validate:refs`, `astro check`)
  — nothing existing violates the new constraint.

- a5e22fa: Render region and faction territory outlines on the interactive map.

  **Schemas** (`@achm/schemas`):
  - Add two optional fields to `FactionSchema`. `hexes` is the per-hex territory
    the faction claims; unlike `region.hexes` it is an overlay **claim**, not a
    partition — overlaps across factions are allowed (contested hexes), coverage
    is not exhaustive, and it drives no terrain/biome defaults. `mapColor` is the
    CSS color used to draw that territory's outline on the interactive map. Both
    are additive and backward-compatible; `areaOfOperation` is unchanged.

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

- 24705c7: Filterable NPC index, NPC↔faction cross-linking, and campaign-status-aware
  list views. Picks up the web-side consumer work deferred by the
  content-status-fields and npc-display-name-rename changesets.

  **Schema** (`@achm/schemas`):
  - `FactionAgentSchema` is now a union of two forms:
    - **With `npcId`** — `name` and `role` are optional and default from the
      linked NPC's `displayName` / formatted occupation.
    - **Without `npcId`** — `name` and `role` are required (standalone
      entry, no NPC data to inherit from).

    Backward-compatible: existing entries with both `npcId` and explicit
    `name`/`role` continue to validate (they match the first variant, with
    the supplied values overriding the NPC defaults).

  **Web** (`@achm/web`):
  - **Filterable NPC index** (`/players-reference/setting/npcs/`) replaces
    the prior static prose list. Alphabetical grouping (by sort key, with a
    `#` bucket for non-letters), live search, faction filter, plotline
    filter, and a "Show inactive" toggle. Filter state is reflected in the
    URL. Faction and plotline filters are GM-only; players see only search
    and show-inactive.
  - **Faction pages** now lead with two NPC lists:
    - **Active Agents** — curated from `faction.activeAgents`, resolved
      against NPC data (falling back to stub rows for standalone entries).
    - **Associated NPCs** — derived from NPCs whose `factions` array
      references this faction, minus anyone already listed under Active
      Agents.

    Each list has its own per-page "Show inactive" toggle with an
    independent URL parameter.

  - **NPC detail pages** link out to each of an NPC's associated factions.
  - **`<Badge>` component** (Astro and Svelte variants) flags GM-only and
    inactive entries across NPC, encounter, plotline, clue, and faction
    list views.
  - **`validate-content-status` build script** (`apps/web/scripts/`) runs
    before the web build and flags broken cross-references — e.g. a
    faction's `activeAgents[].npcId` pointing at a missing, inactive, or
    GM-only NPC; a plotline's `clues[]` pointing at an inactive clue.
  - **Default-hide filtering** for inactive items on index/list pages.
  - **`FactionNpcList` and `NpcList` show-inactive toggles** render via CSS
    `display: none` rather than filtering the array. This works around a
    Svelte 5 keyed-each runtime bug where reordering an item caused the
    shifted `<img>`'s `src` attribute to stick at the previous item's
    value while the rest of the row updated correctly. The CSS approach
    keeps DOM order stable, so the bug is structurally unreachable.

- e711905: Allow hexes (and pointcrawl nodes/edges) to reference a shared
  encounter-category-table by `tableId` in their `encounterOverrides.categoryTables`,
  matching the ability regions and pointcrawls already had — instead of only
  inline tiered entries.
  - `CategoryTableReference` (`encounter-table.ts`) is a new `{ tableId }` schema;
    `CategoryTable` and `EncounterOverrideSchema.categoryTables` now accept it as
    a union alongside `TieredSubtableSchema` for each category.
  - `mergeEncounterOverrides` (`encounters.ts`) treats a `tableId` override as
    replacing the whole category rather than merging into inline tiers, via the
    new `isCategoryTableReference` type guard.
  - `RandomEncounterTable.astro` renders a `tableId`-referenced category with
    `ExternalTableContainer` instead of `CategoryContainer`.
  - `encounter-usage-tracker.ts` resolves `tableId` references through the
    existing `externalTableMap` so encounter usage tracking stays accurate for
    hex/node/edge overrides, not just regions and pointcrawls.

- c505a5e: Add a markdown `gmNotes` field to NPCs and render it on the detail page,
  superseding the deprecated `notes` array.

  **Schema** (`@achm/schemas`):
  - **New** optional `gmNotes: string` on `NpcSchema` — GM-only markdown
    (never shown to players regardless of `visibility`). Holds the truth
    behind the player-facing `description` plus performance and
    run-the-NPC reference. Convention: prose sections for read-once
    material (`## Truth`, `## Voice`), bulleted sections for table-scanning
    (`## Reference`).
  - **Deprecates** `notes: string[]` in favour of `gmNotes`. Kept optional
    so unmigrated files still validate during the migration window; remove
    once no file uses it.
  - Formalizes the player-facing vs GM-only **audience contract** via field
    descriptions: `description`, `occupation`, `species`, `culture`, and
    `class` record the NPC's outward presentation (covers and personas
    written straight); the concealed truth lives in `gmNotes`. Additive and
    backward-compatible — existing YAML/MDX validates unchanged.

  **Web** (`@achm/web`):
  - **NPC detail page** (`/players-reference/setting/npcs/[id]`) renders
    `gmNotes` as a markdown block (inside the existing GM-only
    `SecretContent`). The field's own headings are demoted one level so
    they sit beneath the "GM Notes" section heading.
  - **Falls back** to the deprecated `notes` bullet list when `gmNotes` is
    absent, so NPCs not yet migrated keep displaying their GM notes.

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

- cda9ba0: Add `situational` reports to roleplay book intelligence reports for
  GM-selected, unnumbered entries that sit alongside the existing d12
  random table.
  - **Schema** (`@achm/schemas`): new `SituationalReportRowSchema` —
    identical to `IntelligenceReportRowSchema` minus the `roll` field,
    with the same `linkType`/`linkId` co-presence refinement. New
    optional `situational` field on `IntelligenceReportsSchema`.
    Backward compatible: existing roleplay book YAMLs continue to
    validate unchanged.
  - **Web** (`@achm/web`): `IntelligenceReportsTable` now renders a
    separate "Situational Reports" table above the d12 table when
    situational entries are present, with a "Random Reports (d12)"
    sub-heading on the rolls table for clarity. When `situational` is
    absent or empty, the d12 table renders alone with no sub-heading
    (no behavior change beyond the rename below). Tracking utilities
    (`clue-usage-tracker`, `encounter-processor` lead detection) now
    walk situational rows so links from situational entries participate
    in clue-usage tracking and `isLead` derivation.
  - **Heading rename**: the section heading on roleplay book pages is
    now "Faction Tidings" (was "Intelligence Reports").

- 461e87c: Render legendary actions on stat blocks, and switch the `legendary_actions`
  shape from list-of-strings to list-of-`{name, desc}` objects (matching
  `reactions` and `lair_actions`).
  - **Schema** (`@achm/schemas`): `legendary_actions` is now
    `z.array({ name, desc }).nullable().optional()`. The previous
    list-of-strings form was unstructured and could not be styled
    consistently with reactions or lair actions. Existing data files with
    legendary actions (the three `legion-*` stat blocks plus the new
    `aboleth`) have been migrated.
  - **Web** (`@achm/web`): new `LegendaryActions.astro` component, modeled
    on `LairActions.astro`. Uses `legendary_desc` as the intro paragraph
    and renders each action with the italic-bold name styling used by
    reactions and lair actions. `StatBlock.astro` now mounts it between
    `Reactions` and `LairActions`.

### Patch Changes

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

- 53b5071: Move the hex tag vocabulary out of the schema and into the data repo's
  `tags.yaml`. Removes the `KnownTagEnum` enum, the `KnownTag` type, and the
  `TagSchema` union; the hex `tags` field is now a plain `z.array(z.string())`.

  Runtime validation is unchanged — `TagSchema` was already non-enforcing (its
  `z.string()` fallback accepted any string), so the enum was documentation/
  autocomplete only. The blessed vocabulary now lives in `tags.yaml` and is
  checked by a warnings-only validator. The removed symbols had no consumers.

- ec09103: Add `lost-valley-barrier` to the known hex tag vocabulary (`KnownTagEnum`).
  Additive enum value; runtime validation is unchanged (the `tags` field already
  accepts any string via the `z.string()` fallback in `TagSchema`). Used to flag
  impassable barrier hexes with a GM-facing warning in the web app.

## 5.1.0

### Minor Changes

- 6d0da96: Update faction schema and UI to support narrative-driven faction tracking.

  **Schema (`@achm/schemas`):**
  - Add `quote`, `goals`, `clocks`, `ifIgnored`, `pcIntersections`, and `activeAgents` optional fields to `FactionSchema`
  - Add `FactionClockSchema` and `FactionAgentSchema` helper schemas
  - Export `FactionClockData` and `FactionAgentData` types

  **Web (`@achm/web`):**
  - Add individual faction detail pages at `/gm-reference/factions/[id]`
  - Update faction list page to show summaries with links to detail pages
  - Display all new faction fields on detail pages
  - Add Blades in the Dark-style SVG clock component for progress tracking
  - Add `getFactionPath` route helper; update link generator to use it

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

- 8cd786e: Fix schema to allow -1 for `forecastAfter` value

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

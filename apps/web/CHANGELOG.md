# @skyreach/web

## 4.2.0

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

- d6a1bfb: Add the beat tag vocabulary validator (`npm run validate:tags`, or
  `tsx scripts/validate-tags.ts`). Checks every beat's `tags` against the
  blessed vocabulary in `data/tags.yaml` (the `beat` domain key — future
  vocabularies like clue/hex are sibling keys). Off-vocabulary tags are
  reported grouped by tag, ordered by use count, so cleanup is one decision
  per tag: bless (add to tags.yaml), collapse (rename to a blessed tag), or
  drop (delete; if the info matters, it's body prose).

  A missing or malformed tags.yaml is treated as an empty vocabulary — every
  tag is flagged, which makes the first run the triage worklist.

  Warnings-only by default; `ACHM_STRICT_TAGS=1` fails the build. The gate
  flips on (mirroring `validate:plotlines`) once the data cleanup pass is
  complete.

  No UI change: the beats index already derives its tag filter options from
  the union of beat tags, so the dropdown shrinks automatically as the data
  is cleaned.

- 23c2814: Add the beat tiding orphan-catcher (`npm run tidings:coverage`, or
  `tsx scripts/beat-tiding-coverage.ts`) — the global completeness backstop
  for faction tidings. It lists every live beat (status pending/active,
  campaign-active) whose compound `<plotlineSlug>/<beatSlug>` id appears in no
  `linkType: 'beat'` row across any roleplay book's intelligence reports
  (rolled or selectable).

  This is the "don't forget" signal; the faction tidings aid is the ergonomic
  way to work the list down. In particular it catches what the aid
  structurally misses: beats that are faction-untagged, named obliquely in
  plotline bodies, or whose factions have no roleplay book.

  Distinct from the plotline-refs validator's `orphan-beat` warning, which
  checks beat-file-vs-plotline-`beats`-array sync — this tool checks
  beat-vs-tiding coverage. Both tools share one `isLiveBeat` predicate so they
  agree on what "live" means.

  Warnings-only: always exits 0. Deferred (logged, not built): a strict env
  gate mirroring `ACHM_STRICT_PLOTLINE_REFS` if CI should ever enforce
  coverage.

- 6a9847e: Data-reference tooling: validate and auto-link entity references in
  campaign data files.
  - **New** `scripts/validate-data-refs.ts` (`npm run validate:refs`)
    scans every markdown/YAML file under `data/` for four classes of
    drift: unresolved backtick slugs in prose, dangling markdown links
    to entity URLs, URL drift (link points to a non-canonical path for
    the entity's type), and references to entity types that have no
    public route. Strict by default — non-zero exit on any finding.
  - **New** `scripts/link-data-refs.ts` (`npm run link:refs`) rewrites
    backtick slug references like `` `revenant-courier` `` into proper
    markdown links (`[Revenant Courier](/gm-reference/encounters/revenant-courier)`).
    Skips tokens inside fenced code blocks, existing link text,
    unresolved tokens, and types with no public route. Defaults to
    dry-run; supports `--write`, `--paths`, and `--branch` (only files
    changed vs. `main`).
  - **New** shared `scripts/lib/data-refs.ts` provides the entity
    resolver, backtick/link scanners, and markdown parser used by both
    scripts.
  - **Build integration:** `validate:refs` runs as part of the web
    app's `prebuild.sh`, so any new drift fails the build before
    Astro starts.

- b2fb757: Add the faction tidings authoring aid (`npm run tidings:aid -- [faction-id]`,
  or `tsx scripts/faction-tidings-aid.ts [faction-id]`) — a per-faction
  surfacing convenience for authoring faction tidings. For each faction it
  builds the plotline set as the union of the faction's explicit `plotlines`
  field and plotlines whose body mentions the faction (reusing the plotline-refs
  analyzer's body parsing and name normalization), then lists the live beats
  (status pending/active) and live clues (status unknown) under that set, each
  tagged with how it surfaced (`direct` vs `via-plotline:<slug>`).

  Over-inclusive on purpose: better to show a via-plotline item you then judge
  irrelevant than to miss one. Read-only — never writes status.

  The gather is a pure, tested module (`scripts/faction-tidings-analyzer.ts`)
  with the CLI as one caller, so a future "live threads for this faction" panel
  on `/gm-reference/factions/[id]` can reuse it (logged, not built).

  Known residual (documented, not fixed): body-derivation matches proper
  faction names only, so oblique references ("the kobolds") won't link a
  plotline. The forthcoming beat-tiding coverage tool backstops this; if it
  bites in practice, the fix is faction aliases.

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

- d03067e: Show a spoiler-free warning on Lost Valley-barrier hexes to non-GM viewers.
  The map detail panel and player hex detail page previously showed the GM's
  routing hint (naming the L3/P3 detour) to GMs only and nothing to players;
  players now see a plain "Hex is impassable." notice instead.

  The player-facing hex API (`/api/hexes.json`) no longer forwards the raw
  `tags` array (other tags are spoilers) and instead derives a boolean
  `isImpassable` flag from the `lost-valley-barrier` tag, set only once a hex
  is visited or scouted.

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

- 094fefc: Add the clue/beat placement-integrity validator
  (`npm run validate:placement-integrity`, or
  `tsx scripts/validate-placement-integrity.ts`), which enforces the structural
  invariants from `docs/clue-and-beat-placement-guide.md` that no existing check
  covers. It complements rather than duplicates the two neighbours:
  `validate-hex-beat-refs.ts` still owns hex→beat/book _anchor arrays_, and
  `validate-clue-placements.ts` still owns placement _counts_ — this one walks the
  reference graph.

  Every finding is a hard invariant, so any hit fails the build:
  - **Dangling clue references** — every clue id referenced from a hex
    (landmark/hidden-site clues, hidden-site `clueId`/`linkId`, dream-note
    `clueId`), encounter, dungeon, npc, character, pointcrawl-node, beat, or
    roleplay-book tidings link resolves to a clue file.
  - **Dangling beat `linkId`** — hidden-site and tidings rows whose `linkType` is
    `beat` must resolve (the surface the anchor-array checks don't see).
  - **Forbidden back-links** — a clue or beat file must not carry a placement
    array (`hexes`, `placements`, `locations`, `placedAt`, `hexIds`); placement is
    owned by the location.
  - **Double-home beats** — a beat that is hex-anchored _and_ surfaced in a
    faction-tidings channel is miscategorized (spatial vs. relational).
  - **Duplicate ids** — two clues sharing an id, or two beats sharing a canonical
    `plotline/slug`.
  - **Id / slug mismatches** — a clue whose `id` differs from its filename, or a
    beat whose frontmatter `slug`/`plotline` disagrees with its path.

  The surface-walking and checks live in the pure, unit-tested
  `placement-integrity-analyzer.ts`; the script only loads data and sets the exit
  code. It runs in `prebuild.sh` after the hex→beat anchor check.

  Also fixes `validate-clue-placements.ts`: pointcrawl nodes, characters, and NPCs
  can be authored as `.md`/`.mdx` frontmatter, but the loader only globbed YAML,
  so clues carried by those files vanished from the placement count and read as
  under-placed even though the web app (which loads via Astro content collections)
  counted them. It now loads both formats, keeping the check in agreement with the
  UI it mirrors.

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

- e977adf: Render the clue `summary` field as markdown on the clue detail view
  (`Clue.astro`). It now goes through the inline markdown pipeline
  (`renderBulletMarkdown`), so summaries can use links, emphasis, code, and
  other inline markup instead of displaying raw text — matching how
  `clue.details` and the pointcrawl `summary` already render. The clue list
  search still matches against the raw summary text, so filtering is
  unaffected.
- a5e22fa: Render region and faction territory outlines on the interactive map.

  **Schemas** (`@achm/schemas`):
  - Add two optional fields to `FactionSchema`. `hexes` is the per-hex territory
    the faction claims; unlike `region.hexes` it is an overlay **claim**, not a
    partition — overlaps across factions are allowed (contested hexes), coverage
    is not exhaustive, and it drives no terrain/biome defaults. `mapColor` is the
    CSS color used to draw that territory's outline on the interactive map. Both
    are additive and backward-compatible; `areaOfOperation` is unchanged.

- 5c47a48: Fix the map detail panel showing trails from unrelated hexes. The
  `trailsInHex` filter matched hex IDs with substring `.includes()`, so
  selecting hex `p1` also pulled in every trail touching `p10`–`p19`
  (e.g. `'p11'.includes('p1')`). Switched to exact equality. This also
  resolves a Svelte `each_key_duplicate` crash that occurred when a real
  trail and a wrongly-included one resolved to the same destination hex;
  the trail list is now keyed on the unique trail ID instead of the
  destination.
- 6a9847e: Extract a shared `HexClueList` Svelte component for rendering the
  "Clues:" line under hex landmarks and hidden sites. Replaces the
  duplicated inline rendering in `HiddenSites.svelte` and
  `Landmark.svelte`, and adds support for the `context` field on
  structured clue references (rendered as a parenthesized italic note
  next to the clue link).
- 40656a7: Export interactive map at 300 DPI. The `DownloadButton` now scales the
  canvas pixel dimensions by 300/96 and injects a `pHYs` chunk into the
  PNG so viewers and print software recognize the export as 300 DPI
  rather than the canvas default of 96.
- 6a9847e: Render markdown in two places that previously displayed raw text:
  - **`Clock` component** — the optional `description` field now goes
    through the inline markdown pipeline (`renderBulletMarkdown`), so
    faction-clock descriptions can use links, emphasis, and other
    inline markup.
  - **NPC GM Notes** (`/players-reference/setting/npcs/[id]`) — each
    bullet in the NPC `notes` array is rendered through the same inline
    pipeline. Replaces the deprecated `formatText` helper (which only
    applied smartypants typography).

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

- 6a9847e: Widen the plotline-refs analyzer's NPC-section heading detection so
  prefixed headings like `## Other NPCs` are recognized as NPC sections
  (previously only headings _starting_ with `npcs`/`operatives`/`agents`
  matched). Without this, NPC links under such headings were never
  captured for back-reference validation. Also removes a stray
  `border-radius` on the NPC list row avatar so the avatar is fully
  round (matching the rest of the UI).
- 6422c35: Treat known clues as fully placed in the clue list. A clue with status
  `known` no longer gets the orange "Review" badge when its placement
  count is below `minPlacements`, and it renders in the upright (non-
  italic) style used for placed clues even if it has no placements.

## 4.1.0

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

## 4.0.1

### Patch Changes

- c3181d2: Fix package name in Dockerfile

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

---
'@achm/schemas': minor
'@achm/core': minor
'@achm/web': minor
---

Promote beats from inline plotline data to a first-class content type, add
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

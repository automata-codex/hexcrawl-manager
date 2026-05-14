# Beat Tags + Filterable Index — Implementation Plan

Implements the brief to add an optional `tags` field to beat frontmatter and build a `/session-toolkit/beats/` index mirroring the clue index. Split into two reviewable phases. Each phase ends in a coherent, buildable state so it can be reviewed and committed before moving on.

---

## Context

Plotline beats currently surface only on the per-plotline detail page and the per-beat detail page. Clues have a rich filterable index at `/session-toolkit/clues/` for prep. Beats need the same kind of index but for **live-play summoning**: when the party enters Fort Dagaric or meets a Veil Shepherd, the GM wants to type "fort-dagaric" and instantly see every applicable beat across all plotlines.

The brief asks for:

1. An optional, free-form `tags: string[]` field on the beat schema — the index key.
2. A `/session-toolkit/beats/` page that mirrors the clue index: filter-by-tag (primary axis), faction, plotline, status, plus free-text search on title and trigger.

Tags are intentionally free-form — conventions emerge from use. The existing `trigger` field stays as the GM-facing narrative description; `tags` are the lookup key. Different jobs.

---

## Resolved decisions

1. **Tag shape:** `z.array(z.string()).optional()`. The clue schema uses `z.array(ClueTagSchema).optional()` where `ClueTagSchema = z.union([ClueKnownTagEnum, z.string()])` — effectively free-form via the string fallback but carrying a controlled-vocabulary suggestion. The brief explicitly says "free-form, no controlled vocabulary" for beats, so plain `z.array(z.string())` is the right match.
2. **Route:** `/session-toolkit/beats/`. Matches the at-the-table framing and parallels `/session-toolkit/clues/`. Beat detail pages stay where they are at `/gm-reference/plotlines/[plotline]/beats/[beat]`.
3. **Grouping:** none. Flat list with sort options (Title / Plotline / Status). Matches the clue-index pattern most directly. Grouping can be added later if usage shows it's needed.
4. **Tag display on the detail page:** out of scope. The brief asks for tags as an index key, not a detail-page display element. Small follow-up if we decide later that tag chips on the detail page would help.

---

## Phase 1 — Schema change

**Goal:** Add the optional `tags` field to `BeatSchema` and regenerate JSON schemas. Self-contained, purely additive — safe to ship before the UI exists.

### Work

**Schemas package (`packages/schemas/`):**
- Edit `src/schemas/beat.ts`: add after the `npcs` field, before `clues`:
  ```ts
  tags: z
    .array(z.string())
    .optional()
    .describe('Free-form tags for at-the-table lookup (location, situation, encounter context)'),
  ```
- Regenerate JSON schemas: `npm run build:json-schemas`. The build script (`packages/schemas/src/build-json-schemas.ts`) enumerates every `*Schema` export and emits kebab-case JSON files; `dist/beat.schema.json` updates automatically.
- Add a changeset via `npm run changeset` — minor bump for `@achm/schemas` (additive optional field, not breaking).

**No other changes in this phase.** The Astro content collection in `apps/web/src/content.config.ts:235-240` references `BeatSchema` directly, so once the schema rebuild propagates, beat MD files in the data repo accept the new field automatically. The existing beat detail page (`apps/web/src/pages/gm-reference/plotlines/[plotline]/beats/[beat].astro`) and `resolveBeat` (`packages/core/src/plotlines/resolve-beats.ts`) don't need to change — they don't reference tags.

### Verification

- `npm run build` — TypeScript compiles, JSON schema regenerates.
- `npm run typecheck` — no new errors.
- `npm test` — existing beat tests still pass.
- Optional smoke check: add `tags: [fort-dagaric]` to one beat MD file in the local copy of `../skyreach`, run `npm run dev`, confirm the beat detail page still renders (no schema rejection).

### Commit

One commit, scoped to `packages/schemas/` + changeset file. Example message: `Add optional tags field to beat schema`.

---

## Phase 2 — Beat index page + Svelte component

**Goal:** Build `/session-toolkit/beats/` mirroring the clue index. Consumes the `tags` field from Phase 1.

### Work

**New Astro page (`apps/web/src/pages/session-toolkit/beats/index.astro`):**

Modeled directly on `apps/web/src/pages/session-toolkit/clues/index.astro`. Loads `beats` and `plotlines` collections, flattens beats to `BeatListItem`, aggregates filter options, hands them to the new Svelte component.

```ts
// Sketch — exact field selection and edge cases settled during implementation
const [beatsData, plotlines] = await Promise.all([
  getCollection('beats'),
  getCollection('plotlines'),
]);

const beats = beatsData
  .map((b) => ({
    plotlineSlug: b.data.plotline,
    slug: b.data.slug,
    title: b.data.title,
    trigger: b.data.trigger ?? '',
    status: b.data.status,
    factions: b.data.factions ?? [],
    plotline: b.data.plotline,
    tags: b.data.tags ?? [],
    campaignStatus: b.data.campaignStatus,
  }))
  .sort((a, b) => sortIgnoringArticles(a.title, b.title));

const filterOptions = {
  tags: [...new Set(beats.flatMap((b) => b.tags))].sort(),
  factions: [...new Set(beats.flatMap((b) => b.factions))].sort(),
  plotlines: [...new Set(beats.map((b) => b.plotline))].sort(),
};

const plotlineNames = Object.fromEntries(plotlines.map((p) => [p.id, p.data.title]));
```

Wrap with `SecretLayout` (title "Beats") and render `<BeatList client:load … />`.

**New Svelte component (`apps/web/src/components/BeatList.svelte`):**

Copy `ClueList.svelte` as a starting point, then adapt:

- **Props:** `beats: BeatListItem[]`, `filterOptions: { tags, factions, plotlines }`, `plotlineNames: Record<string, string>`.
- **Filters (all URL-synced via `apps/web/src/utils/url-filter-state.ts`):**
  - `search` — matches `title` or `trigger` (case-insensitive substring).
  - `tag` — primary axis. Same `<select>` pattern as the clue tag filter.
  - `faction` — same pattern as clue, including `__none__` option for unaffiliated.
  - `plotline` — same pattern, uses `plotlineNames` for display.
  - `status` — `pending / active / resolved / skipped`.
  - `show-inactive` — checkbox, same pattern as clue index.
- **Sort selector** (`sort` URL param, default `title`): `Title` / `Plotline` / `Status`. Applied in the `$derived` block after filtering.
- **No grouping.**
- **Drop clue-only filters:** `usage` and `review` — those depend on placement tracking that doesn't apply to beats.
- **Per-item rendering:**
  - Link target: `/gm-reference/plotlines/{plotlineSlug}/beats/{slug}` (existing detail page).
  - Title as link text.
  - Plotline name as small/dim suffix (use `plotlineNames`).
  - Status badge if status ≠ `pending` (color scheme matches `[beat].astro:49-54`).
  - Inactive badge if `campaignStatus === 'inactive'`.
  - Trigger as a one-line preview below the title (or wrap if too long — match clue list density).

Reuse existing utilities (don't duplicate):
- `apps/web/src/utils/url-filter-state.ts` — `initFilterFromUrl`, `setUrlParam`, `initBooleanFilterFromUrl`, `setBooleanUrlParam`.
- `apps/web/src/components/Badge.svelte` — status and inactive badges.
- `@achm/core` `sortIgnoringArticles` — title sort.

**Nav discovery:**
- Check `apps/web/src/pages/session-toolkit/index.astro` (if it exists) for a card/link grid; add a "Beats" entry alongside "Clues".
- Grep shared layout/nav components for hard-coded session-toolkit links and add a beats entry if appropriate.

### Verification

1. `npm run build` — both packages and Astro app build cleanly.
2. `npm run dev`, open `http://localhost:<port>/session-toolkit/beats/`.
3. **Walk the filters end-to-end** (requires at least one tagged beat in `../skyreach`; if there isn't one yet, add `tags: [fort-dagaric, npc-arrival]` to a Daemaris beat locally to exercise the UI):
   - Tag dropdown shows the new tag; selecting it narrows the list.
   - Faction / plotline / status filters each narrow correctly.
   - Free-text search matches title and trigger.
   - Sort by title / plotline / status reorders.
   - URL params update as filters change; reloading restores state.
   - Beat row links land on the existing beat detail page.
   - `Show inactive` toggle works against a `campaignStatus: inactive` beat.
4. `npm run typecheck` and `npm run lint`.
5. `npm run arch:check` — confirms the new page/component don't violate dependency boundaries.

### Commit

One commit (or two if nav changes feel separable). Example message: `Add beat index page at /session-toolkit/beats/`.

---

## Out of scope (deferred, per brief)

- Encounter-table integration (beats as triggerable entries in tagged hex/terrain rolls). Defer until enough beats have tags to clarify which contexts get pulled often enough to deserve dice slots.
- Rendering tags on the beat detail page.
- Backfilling tags onto existing beat MD files in the data repo. Adoption happens organically as the GM works through beats; the brief explicitly says conventions emerge through usage.

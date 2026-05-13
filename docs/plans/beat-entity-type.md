# Beat Entity Type — Implementation Plan

Promotes `beats` from an inline array on plotlines to a first-class content collection. Source brief and decisions captured below; phases sized for individual review and commit.

After each phase: pause for manual code review + `git commit`. Data-repo edits (the separate `../skyreach` repo) and migration scripts are out of scope for this plan — only schema/loader/UI work in the code repo.

---

## Pre-flight notes (resolved from a codebase audit + user Q&A)

1. **Beat file format.** `.md` with YAML frontmatter (matches the existing plotline pattern; gives us a markdown body for notes without inventing a second pattern).

2. **Beat directory layout.** `<DATA>/plotlines/<plotline-slug>/beats/<beat-slug>.md`. Plotlines themselves stay at the top level (`<DATA>/plotlines/<plotline-slug>.md`) for now — promoting plotlines into directories of their own is not in scope. So both files coexist at the same root: the flat plotline files plus per-plotline `beats/` subdirectories.

3. **Glob collision.** Today's plotlines loader uses `**/*.{md,mdx}` based at `DIRS.PLOTLINES` — once `beats/` subdirs exist, this glob will pick beats up *as plotlines* and fail schema validation. The plotlines pattern must narrow to top-level only (`*.{md,mdx}`) at the same time the beats collection is introduced. This is the only meaningful loader risk in the plan.

4. **Beat schema fields (from brief + user Q&A).**
   - Reuse the existing `PlotlineBeatStatusEnum` (`'pending' | 'active' | 'resolved' | 'skipped'`) rather than introducing `abandoned`. The existing inline data already conforms.
   - Keep `npcs: z.array(z.string()).optional()` (carry-over from inline beats).
   - Keep `clues: ClueReferencesSchema` (string-or-`{id, context}`) — preserves the `context` field migration-friendly.
   - Add `plotline: z.string()` (required) — redundant with the path, but explicit makes validation and reverse-lookup straightforward.
   - Add `slug: z.string()` — explicit, mirroring plotlines/clues. Should match the filename.
   - `campaignStatus` (`CampaignStatusEnum`, default `'active'`) — standard across all entities; include it for consistency with the rest of the collection ecosystem.

5. **Routing.** Astro can support a nested `[plotline]/beats/[beat].astro` route alongside the existing flat `[id].astro` plotline route; the two patterns don't collide because they differ in segment count.

6. **Plotline `beats` reference array shape.** Per-plotline beats are co-located, so the array stores **bare beat slugs** (e.g. `strangers-at-the-scar-site`) not full paths. Resolution does `<plotline-slug>/beats/<beat-slug>` lookup against the beats collection.

7. **Bidirectional references are intentional.** The brief calls this out: the plotline's ordered `beats` array carries sequence; the beat's `plotline` field carries reverse-lookup. Both are sources of truth for their respective directions — validation (Phase 2) enforces they agree.

---

## Phase 1 — Beats collection: schema + loader, no content

**Goal:** Define the beat schema and wire the content collection so it loads (even if empty), without touching plotlines yet. Plotlines glob is narrowed in the same phase to prevent collision the moment anyone drops a beat file into the data repo.

This phase is committable in a "schema + loader scaffold" state: build passes, no UI changes, the beats collection is queryable but empty.

### Work

- **New schema** `packages/schemas/src/schemas/beat.ts`:
  - Import `PlotlineBeatStatusEnum` and `ClueReferencesSchema` from existing modules; do not redefine them.
  - Define `BeatSchema` with fields: `title` (required), `slug` (required), `plotline` (required string), `trigger` (optional), `status` (defaults `'pending'`, uses `PlotlineBeatStatusEnum`), `drivers` (optional `z.array(z.string())` — faction slugs), `npcs` (optional `z.array(z.string())`), `clues` (`ClueReferencesSchema`), `campaignStatus` (defaults `'active'`).
  - Export `BeatData` type.
- **Barrel export** `packages/schemas/src/schemas/index.ts`: re-export `./beat.js` (verify `export *` style is what the file uses — match it).
- **JSON schemas:** run `npm run build:json-schemas` to confirm the build script picks up `BeatSchema` automatically and emits `packages/schemas/dist/beat.schema.json`. The `dist/` directory is gitignored, so nothing to commit here — this step is a sanity check, not a deliverable.
- **Data dir constant** `packages/data/src/dirs.ts` (or wherever `DIRS.PLOTLINES` lives — confirm during implementation): no new constant needed. Beats are loaded via a glob based at `DIRS.PLOTLINES` with a deeper pattern.
- **Content collection** `apps/web/src/content.config.ts`:
  - Narrow the existing `plotlines` collection pattern from `'**/*.{md,mdx}'` to `'*.{md,mdx}'` so it picks up only top-level plotline files, not the new `beats/` subdirectory contents. Use `collectionHasContent(DIRS.PLOTLINES)` gate as the existing collection does.
  - Add a new `beats` collection using `glob({ pattern: '*/beats/*.{md,mdx}', base: DIRS.PLOTLINES })`, gated by `collectionHasContent(DIRS.PLOTLINES)` (same gate — beats and plotlines share a parent dir).
  - Register `beats: defineCollection(...)` and add it to the exported `collections` object.

### Verification

- `npm run build` succeeds.
- `npm run typecheck` and `npm run arch:check` pass.
- Manually confirm `getCollection('beats')` returns `[]` in dev (no beat content yet).
- Confirm `getCollection('plotlines')` still returns the existing plotlines unchanged.

---

## Phase 2 — Plotline schema: optional `beats` references array

**Goal:** Plotline schema gains an optional ordered array of beat-slug references. The inline `beats` field stays put (migration brief still depends on it). No UI changes.

Small, mechanical phase. Worth keeping separate from Phase 1 because it touches the plotline schema rather than the new collection.

### Work

- `packages/schemas/src/schemas/plotline.ts`:
  - Rename the existing `beats: z.array(PlotlineBeatSchema).optional()` field to `inlineBeats` — **OR** keep the name `beats` for the inline array and pick a different name (`beatRefs`?) for the new reference field. Decision: **keep `beats` as the inline array (no churn for the migration brief) and add the new field as `beatRefs: z.array(z.string()).optional()`.** Phase 5 renames `beatRefs` → `beats` after the inline field is removed.
  - Add a one-line `.describe()` on `beatRefs` clarifying it stores bare beat slugs.
- Regenerate JSON schemas (`npm run build:json-schemas`) as a sanity check; `dist/` is gitignored.
- **Validation script update** `apps/web/scripts/validate-plotline-refs.ts`: add a check that every slug in `plotline.beatRefs` exists in the beats collection under that plotline (and conversely, that every beat's `plotline` field matches its parent directory and appears in the parent's `beatRefs`). Emit warnings, do not fail the build — matches the existing validator convention.

### Verification

- `npm run build` succeeds with existing plotline YAML (no `beatRefs` set) unchanged.
- Hand-edit a single plotline to add a `beatRefs: [some-slug]` and a matching beat file in `../skyreach/data/plotlines/<that-plotline>/beats/some-slug.md`; rebuild and confirm both collections load and validator emits no warning.

---

## Phase 3 — Beat detail page

**Goal:** Standalone page surfacing a beat's full content: title, status badge, trigger, drivers, npcs, clues, parent plotline link, markdown body.

This phase introduces UI without changing the plotline page yet — beats become reachable by direct URL but the plotline page still uses inline data.

### Work

- **New route** `apps/web/src/pages/gm-reference/plotlines/[plotline]/beats/[beat].astro`:
  - `getStaticPaths()` enumerates all beat entries: returns `{ params: { plotline: beat.data.plotline, beat: beat.data.slug } }` for each.
  - Page body queries the beat by `(plotline, beat)` pair (filename id is `<plotline>/beats/<beat>`), 404 if missing.
  - Build lookup maps over `clues`, `npcs`, `factions` collections (reuse the pattern from `[id].astro`).
  - Reuse `resolveBeats()` from `@achm/core` if it fits — but since the function is designed for an array, easiest is to call it on `[beatData]` and unwrap. If awkward, factor a `resolveBeat(beatData, maps)` companion in `@achm/core` and reuse it from `resolveBeats` internally. **Decision deferred to implementation** — pick whichever path is shorter when the code is in front of you.
  - Render: title, parent plotline link (back to `/gm-reference/plotlines/<plotline-slug>`), status badge (reuse `<Badge>`), trigger (muted), drivers/npcs/clues lists (linked, with `(not found)` markers for unresolved refs — same pattern as `PlotlineBeats.astro`), then `<Content />` from `render(beat)` for the markdown body.
  - Use `SecretLayout` (consistent with plotline detail pages).
- **Cross-link from plotline page:** *not yet* — that's Phase 4. The plotline page still renders `<PlotlineBeats>` with inline data.

### Verification

- Add one real beat file in the data repo for a single plotline.
- Add a `beatRefs: [<slug>]` entry on that plotline so Phase 2 validation is happy.
- Visit `/gm-reference/plotlines/<plotline>/beats/<beat>` in dev — confirm renders correctly.
- Visit `/gm-reference/plotlines/<plotline>` — confirm the existing inline beats UI still works untouched.

---

## Phase 4 — Plotline page UI swap to compressed list

**Goal:** Replace the verbose `<PlotlineBeats>` block on the plotline page with a compressed list driven by `plotline.beatRefs` → beats collection lookups. Resolved beats visually de-emphasized but not hidden.

This is the visible behavior change. Inline beat data still exists in the schema and YAML, but is **no longer rendered on the plotline page** — the new list reads from references.

### Work

- `apps/web/src/pages/gm-reference/plotlines/[id].astro`:
  - Stop calling `resolveBeats(plotline.data.beats, ...)`.
  - Load `getCollection('beats')` and filter to beats whose `data.plotline === plotline.data.slug`. Build a map keyed by `beat.data.slug`.
  - Walk `plotline.data.beatRefs ?? []` in order, look each slug up in the map, render one row per beat.
  - Drop the `<PlotlineBeats>` component usage. (Keep the file for now; Phase 5 removes it.)
- **New component** `apps/web/src/components/PlotlineBeatList.astro` (or inline the markup if it stays trivial):
  - One row per beat: title (linked to the Phase 3 beat detail page), trigger (muted, only when present), status (`<Badge>`).
  - Resolved beats (`status === 'resolved'`) get a `.is-resolved` class that lowers opacity / desaturates. Do not hide.
  - Beats referenced in `beatRefs` but missing from the collection: render a "(missing: `<slug>`)" inline marker (same defensive-UI pattern used elsewhere). Validator from Phase 2 would have warned in build, but the page shouldn't crash.

### Verification

- `npm run build` succeeds.
- Visit a plotline page in dev: confirm the new compressed list renders, links work, resolved beats look de-emphasized.
- Confirm the per-beat detail pages still work (Phase 3 regression check).
- Confirm a plotline with empty `beatRefs` renders cleanly (no orphaned section).

---

## Phase 5 — Remove inline beats field (post-migration)

**Goal:** Once the migration script has copied every inline beat into a per-beat file and populated `beatRefs` on the parent plotline, retire the inline data path entirely.

**Prerequisite:** the migration brief (out of scope here) has run, every plotline's inline `beats` array is empty in the data repo, and `beatRefs` is populated. This phase is purely a code-side cleanup — it deletes the now-unused inline schema field, its rendering helper, and the alias from Phase 2.

### Work

- `packages/schemas/src/schemas/plotline.ts`:
  - Remove the inline `beats: z.array(PlotlineBeatSchema).optional()` field.
  - Rename `beatRefs` → `beats` (the natural name now that the inline field is gone).
  - Decide whether to keep `PlotlineBeatSchema` and `PlotlineBeatStatusEnum` exported. `PlotlineBeatStatusEnum` is still used by the new `BeatSchema`, so it stays. `PlotlineBeatSchema` becomes unused unless something else imports it (grep before deleting).
- `packages/schemas/src/schemas/index.ts`: drop any export that becomes dead.
- Regenerate JSON schemas as a sanity check (`dist/` is gitignored).
- `packages/core/src/plotlines/resolve-beats.ts` (the `resolveBeats` function): if no remaining caller uses it after Phase 4 (the plotline page no longer does, and Phase 3 may or may not — see Phase 3's deferred decision), delete it. Otherwise leave it. Grep to confirm.
- `apps/web/src/components/PlotlineBeats.astro`: delete (the rich inline component, no longer referenced anywhere).
- `apps/web/src/pages/gm-reference/plotlines/[id].astro`: update any code that referenced `plotline.data.beatRefs` to use `plotline.data.beats` after the rename.

### Verification

- `npm run build`, `npm run typecheck`, `npm run arch:check`, `npm run lint` — all pass.
- Visit a representative plotline page and a beat detail page in dev — confirm nothing regressed visually.
- Grep the repo for `PlotlineBeats` and `beatRefs` — should find zero references.

---

## Out of scope (for reference)

Per the brief:
- Migration script that reads inline `beats` arrays and emits per-beat `.md` files. (Lives in the data-repo workflow or a separate one-shot tool; this plan assumes it runs between Phase 4 and Phase 5.)
- Encounter → beat references.
- Cross-plotline chronological/timeline view.
- Any changes to clues, NPCs, factions.

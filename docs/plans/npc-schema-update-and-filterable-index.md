# NPC Schema Update and Filterable Index — Implementation Plan

Implements `docs/specs/npc-schema-update-and-filterable-index.md` in three reviewable phases. Each phase ends in a coherent, buildable state so it can be reviewed and committed before moving on.

---

## Resolved decisions

1. **Helper name:** `getNpcSortKey` (matches the `NpcData` type and camelCase convention; spec used both spellings — this is the one we go with).
2. **Schema additions:** `factions` and `plotlines` are added as optional string arrays on the NPC schema in Phase 1, anticipating the data shape and unblocking the Phase 2/3 filters.
3. **Sort:** alphabetical by `getNpcSortKey` is the only sort. The letter-group headers make the sort visible without needing a sort dropdown. No "recently updated" option, no mtime work.
4. **GM variant + status flags:** deferred entirely until `inactive` / `hidden` land in the schema. Phase 3 leaves a `TODO` comment pointing at the spec.
5. **Text search:** included in Phase 2. The spec doesn't call it out explicitly, but both `ClueList.svelte` and `EncounterList.svelte` (the patterns the spec tells us to mirror) have a name-text search at the top. A case-insensitive substring match against `displayName` and `sortName`, ANDed with the faction filter, matches user muscle memory from those pages. URL param `q`.

---

## Phase 1 — Schema update + propagate field rename

**Goal:** Make the schemas package match the new NPC shape, expose the sort-key helper, and update every existing reference to `npc.name` / `npc.title` in `apps/web` so the build stays green. The existing prose index page remains live (with the new fields) until Phase 2 replaces it.

This is intentionally a single phase rather than two: a commit that updates the schema without updating the web references would leave the build broken. Bundling them produces one coherent reviewable change.

### Work

**Schemas package (`packages/schemas/`):**
- Edit `src/schemas/npc.ts`:
  - Remove `name: z.string()` and `title: z.string().optional()`
  - Add `displayName: z.string()` (required)
  - Add `sortName: z.string().optional()`
  - Add `factions: z.array(z.string()).optional()`
  - Add `plotlines: z.array(z.string()).optional()`
  - Export helper:
    ```ts
    export function getNpcSortKey(npc: NpcData): string {
      return npc.sortName ?? npc.displayName;
    }
    ```
- Confirm `src/schemas/index.ts` re-exports the new helper (the existing `export * from './npc.js'` will cover it).
- Run `npm run build:json-schemas` to regenerate `dist/npc.schema.json` and the manifest.
- Update or add unit tests for the schema (`*.spec.ts` next to `npc.ts` if one exists; otherwise skip — there is no enforced parity requirement).
- Add a changeset via `npm run changeset` describing the breaking field rename and helper export. Mark schemas as a major bump.
- Add a CHANGELOG entry (changeset will produce one on `release:version`, but the spec asks for explicit prose noting this requires a matching data-repo migration — include that in the changeset summary).

**Web app (`apps/web/`):**
- `src/pages/players-reference/setting/npcs/index.astro` (uncommitted edits already present — incorporate or rebase):
  - Line 28 sort: replace `sortIgnoringArticles(a.data.name, b.data.name)` with a `getNpcSortKey`-based comparator (case-insensitive).
  - Line 79: `alt={npc.data.name}` → `alt={npc.data.displayName}`.
  - Line 81: `{npc.data.title}{' '}{npc.data.name}` → `{npc.data.displayName}` (title is folded into displayName by the migration).
- `src/pages/players-reference/setting/npcs/[id].astro`:
  - Line 48: `const title = npc.name;` → `const title = npc.displayName;`
  - Line 142: `alt={npc.name}` → `alt={npc.displayName}`
  - Line 144: remove the conditional `{npc.title && <p class="subtitle is-4">{npc.title}</p>}` block entirely (honorific now baked into `displayName`; no separate subtitle).
- Audit for stragglers: re-grep `apps/web/src` for `\.name` and `\.title` on NPC objects. Confirmed touchpoints from survey:
  - `apps/web/src/utils/clue-usage-tracker.ts` references `NpcData` — verify any name access uses `displayName`.
  - `apps/web/src/components/Clue.astro` (lines 74–75, 131–133) — confirm whether these read NPC names; update if so.
  - `apps/web/src/content.config.ts` uses `NpcSchema` only for validation, no field access.
- Run `npm run typecheck`, `npm run build:web`, and `npm test` to confirm everything compiles and existing tests pass.

### Review focus

- Schema diff matches the spec (field removals, additions, helper signature, exports).
- Helper is used at every NPC sort site — no inline `npc.sortName ?? npc.displayName` fallbacks leak in.
- All `npc.name` / `npc.title` references are gone from `apps/web`.
- Changeset is correct (major bump, breaking-change note about data-repo migration).
- Build is green; existing prose NPC index page still renders with the new fields.

### Out of scope for this phase

- New filterable index (Phase 2).
- Any inactive/hidden status work (deferred entirely).
- Changes to the per-NPC detail page beyond the field rename (per spec).

---

## Phase 2 — Filterable NPC index: list, letter groups, URL state, text search, faction filter

**Goal:** Replace the prose index page at `/players-reference/setting/npcs` with a new filterable list that mirrors the clues filterable page. Ship the alphabetical-with-letter-headers list, URL state, the text search box, and the faction filter. Plotline filter and polish are Phase 3.

Splitting faction (Phase 2) from plotline (Phase 3) keeps each commit reviewable; faction is a straightforward field-driven multi-select, while plotline involves a slug→title lookup and deserves its own review pass.

### Work

**New Svelte component: `apps/web/src/components/NpcList.svelte`**

Model on `apps/web/src/components/ClueList.svelte` and `apps/web/src/components/EncounterList.svelte`. Component receives a `npcs` prop (lightweight list items, see below) and a `factionsById` lookup map from id → display name.

Implement:
- **Row rendering:** thumbnail (or placeholder) + `displayName` as primary text + `occupation` as secondary; clickable row → `/players-reference/setting/npcs/{id}`. Compact rows, scannable, not the current prose look. Match clue/encounter row styling.
- **Sort:** always alphabetical by `getNpcSortKey(npc)`, case-insensitive. No sort dropdown — the letter headers serve as the visible sort indicator, which satisfies the spec's "do not ship with an invisible default sort" requirement.
- **Letter-group headers:** render a header per first-letter of the sort key. So "Sergeant Brenn Hardback" (sortKey starts with "H") sits under **H**.
- **Text search:** input at the top of the filter row. Case-insensitive substring match against both `displayName` and `sortName` (so typing "Mar" matches "Mara Tindle" *and* an NPC sorted as "Tindle, Mara"). ANDs with the faction filter. Mirror the position and styling of the search input in `ClueList.svelte`/`EncounterList.svelte`.
- **Faction filter:** multi-select control. Source the list of available factions from the `factionsById` prop. Filter logic: NPC matches if any of its `factions` ids is in the selected set. Treat missing `factions` as `[]`. UI label uses `faction.name`, not the raw id (the spec is explicit about this — clues currently render the raw kebab id, so this is a deliberate improvement over the clues pattern).
- **URL state:** use `apps/web/src/utils/url-filter-state.ts` exactly as `ClueList.svelte` does. Keys: `q` (text search), `factions` (comma-joined). State persists across reload and back/forward.

**Page route: `apps/web/src/pages/players-reference/setting/npcs/index.astro`**

Overwrite the existing prose page. Data loading:
- Load NPCs from the content collection.
- Load factions (`apps/web/src/content.config.ts` already defines the collection). Build a `Map<string, string>` from `id` → `name`.
- Project each NPC to a lightweight list item: `{ id, displayName, sortKey, occupation, image, factions }`. Use `getNpcSortKey` from `@achm/schemas`.
- Pre-sort by sort key (case-insensitive) before passing to the component.
- Pass `npcs` and `factionsById` to `<NpcList client:load …>` (use whatever directive the clue list uses — survey shows `client:load` or similar).
- Do NOT wrap in `SecretLayout`. This page is player-facing. (The GM variant — toggle plus hidden-NPC visibility — is deferred until status flags land.)

**No new state-flag handling:** since `inactive` and `hidden` aren't in the schema yet, every NPC is treated as visible. Add a `// TODO(npc-status): apply hidden/inactive once schema lands — see docs/specs/npc-schema-update-and-filterable-index.md` comment at the loader site.

### Review focus

- Component visually matches the clues/encounters filterable lists (look-and-feel parity is a spec requirement).
- Letter groups correct (Sergeant Brenn Hardback under **H**, Master-at-Arms Kardek under **K**, Commander Law under **L**, Cassio Vandermere under **C**).
- Text search: typing "Mar" surfaces "Mara Tindle" / "Tindle, Mara"; case-insensitive; ANDs cleanly with faction selection.
- URL state survives reload and back/forward — text query and faction selection both persist.
- Faction labels in the filter UI come from `faction.name`, not the kebab id.
- Player-facing page (not GM-gated). Build is green. `getNpcSortKey` is the sole sort-key source.

### Out of scope for this phase

- Plotline filter (Phase 3).
- Empty-state polish, status TODOs at the component level, and any final cleanup (Phase 3).
- GM variant / status flags (deferred).

---

## Phase 3 — Plotline filter, empty state, polish

**Goal:** Add the plotline filter, the friendly empty state with a "Clear filters" button, and final acceptance polish. After this phase, every Phase-1/2 acceptance criterion in the spec is satisfied.

### Work

**Plotline filter:**
- Source: NPCs' own `plotlines: string[]` field (added in Phase 1). No reverse lookup needed.
- Load plotlines in `index.astro` and build a `Map<string, string>` from `slug` → `title` (matches the existing clue-list pattern at `ClueList.svelte:74`). Pass to `NpcList.svelte`.
- Add a multi-select to `NpcList.svelte` mirroring the faction filter. URL param key: `plotlines`. Labels come from `plotline.title`.
- Filter logic: NPC matches if any of its plotline ids is in the selected set; empty selection = no constraint.

**Empty state:**
- When filtered count is zero, render a friendly empty block ("No NPCs match these filters.") with a "Clear filters" button that resets `q`, `factions`, and `plotlines` and clears those URL params. Match the existing pattern from clues/encounters; if they don't have an explicit empty-state component, mint a minimal one inline.

**Status TODO:**
- Add or confirm the TODO comment at the loader/component boundary referencing the spec for `hidden`/`inactive` work to come. Mention the GM-visible-with-indicator behaviour from spec §"Status filtering" so a future reader has the full picture.

**Acceptance pass:**
- Walk through every bullet in the spec's "Acceptance" section and verify:
  - Schemas package builds, JSON schemas regenerate, version bumped.
  - `/players-reference/setting/npcs` renders the filterable list; old prose page is gone (overwritten in Phase 2).
  - No remaining `npc.name` / `npc.title` references in `apps/web` (re-grep).
  - Sort uses `getNpcSortKey` exclusively (re-grep).
  - Letter-group examples render under the expected letters.
  - Faction and plotline filters work end-to-end with URL state and match the clues filterable list's behaviour.
- Run `npm run typecheck`, `npm run build:web`, `npm test` once more.

### Review focus

- Plotline filter labels are titles, not slugs.
- Empty-state behaviour is friendly and the "Clear filters" button restores a usable list.
- Acceptance checklist is fully satisfied — surface anything still pending here, not after merge.

### Out of scope for this phase

- GM variant + `hidden` / `inactive` status filtering (deferred; tracked by the TODO).
- v2 filters (species, culture, location, tags) — spec explicitly defers them.
- Cross-references from faction pages to NPCs (`activeAgents` rendering) — spec explicitly defers.

---

## Summary

| Phase | Scope | Approx. size | Build state at end |
|------|------|------|------|
| 1 | Schema + helper + propagate field rename in `apps/web` | Small–medium, mostly mechanical | Green; prose index still live |
| 2 | New filterable index (list + letter groups + URL state + text search + faction filter); prose page deleted | Medium–large; biggest visual change | Green; new index live, plotline filter not yet present |
| 3 | Plotline filter + empty state + acceptance polish | Small | Green; all Phase-1/2 acceptance criteria met |

Deferred entirely until the data migration adds `inactive` / `hidden`: status filtering, GM toggle, GM-only variant.

# Faction Pages: Render Associated NPCs — Implementation Plan

Implements `docs/specs/factions-pages-associated-npcs.md` in two reviewable phases. Each phase ends in a coherent, buildable state so it can be reviewed and committed before moving on.

Schema cleanup of `activeAgents` is **out of scope** for this work (despite a couple of lingering mentions in the spec). The existing `Faction.astro` activeAgents bullet list stays untouched; the new section sits alongside it. The two render different views of the same conceptual relationship — `activeAgents` is a curated GM-authored list of named representatives, and the new section is the exhaustive query-derived affiliation list. They coexist.

---

## Resolved decisions

1. **Helper name.** Spec writes `getNPCSortKey`; the actual export is `getNpcSortKey`. Same spelling drift as the original NPC-filter spec — using the real name.
2. **Visibility filtering on the faction detail page.** The faction detail route is `/gm-reference/factions/[id].astro`, wrapped in `SecretLayout`, which 404s for non-GM viewers. So `isPlayerVisible` filtering is a no-op here. Render all NPCs and leave a one-line comment for any future player-facing variant.
3. **Row reuse strategy.** The spec says "Reuse the same row component if one exists; don't fork it." None exists today — `NpcList.svelte` inlines the row markup + CSS. Phase 1 extracts a small `NpcListRow.svelte` and refactors `NpcList.svelte` to use it. Phase 2 reuses it on the faction page.
4. **`activeAgents` left alone.** The existing field, schema, and rendering all stay. The validator's `faction.activeAgents[].npcId` check from the content-status work continues to apply.

---

## Phase 1 — Extract `NpcListRow.svelte`

**Goal:** Pull the per-row markup + styles out of `NpcList.svelte` into a small reusable component, with no user-visible behavior change. Sets up Phase 2 to consume the same row without duplication.

This is a pure refactor. The acceptance bar is "the filterable NPC index looks and behaves exactly as it did before."

### Work

- Create `apps/web/src/components/npc-list-types.ts` exporting the `NpcListItem` interface (currently local to `NpcList.svelte`). One source of truth so the row and both lists agree.
- Create `apps/web/src/components/NpcListRow.svelte`:
  - Props: `npc: NpcListItem`.
  - Markup: the `<a class="npc-link">…</a>` block from `NpcList.svelte` — thumbnail (or dashed placeholder), display name, GM/inactive badges, occupation.
  - CSS: move the row-specific rules — `.npc-link`, `.npc-link:hover` and its descendant rules, `.npc-thumb`, `.npc-thumb-placeholder`, `.npc-text`, `.npc-name`, `.npc-occupation`. These should be self-contained — they don't reference grouping/letter-header/column-layout selectors.
- Refactor `NpcList.svelte`:
  - Import `NpcListRow` and `NpcListItem` from the new files.
  - Replace the inline row markup inside `<li class="npc-item">` with `<NpcListRow npc={npc} />`.
  - Delete the row-specific CSS that moved to `NpcListRow.svelte`.
- `npm run typecheck` + `npm run build:web` to confirm everything still compiles.
- Manually verify in dev that the filterable index renders identically — same row spacing, badges, hover states, group letter headers, link behavior.

### Review focus

- The refactor is genuinely behavior-preserving — no visual diff on the filterable NPC index.
- `NpcListItem` lives in one place; `NpcList.svelte` and `NpcListRow.svelte` both import from it.
- `NpcList.svelte` is shorter; nothing the row uses leaks back into the parent's scope.
- Build is green.

### Out of scope for this phase

- Any new feature surface (Phase 2).
- Faction page changes (Phase 2).

---

## Phase 2 — Render Associated NPCs on faction detail pages

**Goal:** Each faction detail page renders an `Associated NPCs` section listing every NPC that declares the faction in its own `factions` array. Filtered by `isActive` by default with a "Show inactive" toggle; sorted via `getNpcSortKey`; rendered using `NpcListRow` so it matches the filterable NPC index exactly. Empty results render no section at all.

### Work

**New component: `apps/web/src/components/FactionNpcList.svelte`:**

- Props: `npcs: NpcListItem[]` (already filtered to the current faction by the page route, and projected into the shared shape).
- State: `let showInactive = $state(initBooleanFilterFromUrl('show-inactive'))` + a `$effect` calling `setBooleanUrlParam('show-inactive', showInactive)`. Same URL-param key as the filterable indexes — different page, different URL, no collision.
- Filter: hide rows where `campaignStatus === 'inactive' && !showInactive`.
- Layout: single-column `<ul>` (no need for the two-column flow used by the index — the faction page already has surrounding content competing for width). No letter-group headers; faction NPC lists are short.
- Toggle UI: a small `<label><input type="checkbox" bind:checked={showInactive}> Show inactive</label>` rendered *only* when at least one inactive NPC exists in the input (no point in showing a useless control when there's nothing to toggle).
- Renders `<NpcListRow npc={npc} />` for each filtered row — gets the GM/inactive badges from the row component for free.

**Page route: `apps/web/src/pages/gm-reference/factions/[id].astro`:**

- Load `getCollection('npcs')` alongside the existing `getEntry('factions', id)`.
- Filter NPCs to those where `entry.data.factions?.includes(faction.id)` is true. (No `isPlayerVisible` filtering — the route is GM-only. Leave a brief comment to that effect.)
- Project each surviving entry into the shared `NpcListItem` shape (`id`, `href` via `getNpcPath`, `displayName`, `sortKey` via `getNpcSortKey`, `occupation`, `image`, `factions`, `plotlines`, `visibility`, `campaignStatus`).
  - `occupation` should match the index's formatted output. `formatOccupation` is duplicated in two places already (NPC index + NPC detail); if adding a third copy here, lift it into a small util — otherwise inline a copy.
- Sort by `sortKey` case-insensitively (same comparator the index uses).
- Decide whether to render the section: count the *active* NPCs after filtering by faction id. If zero, omit the section entirely (no heading, no toggle, no empty placeholder — per spec). If ≥1, render:
  ```astro
  <h2 class="title is-3">Associated NPCs</h2>
  <FactionNpcList client:load npcs={…} />
  ```
- Place the section after the existing `<Faction>` content block and before `</SecretLayout>`.

### Review focus

- Section appears with the queried NPC list when there's at least one active match; section is fully absent when there are zero active matches (not "empty heading," not "0 NPCs").
- Inactive NPCs are hidden by default; the "Show inactive" toggle reveals them with the `inactive` badge; URL state persists across reload and back/forward.
- GM-only NPCs show with the purple `GM` badge (since this route is GM-only, they're always rendered).
- Rows are visually identical to the filterable NPC index — the shared `NpcListRow` from Phase 1 guarantees this.
- Sorting via `getNpcSortKey` matches the filterable index's order (case-insensitive).
- Build green. The `SecretLayout` 404 behavior for non-GM viewers is unchanged.

### Out of scope for this phase

- Counts on the faction *index* page (deferred per spec).
- NPC detail page → faction cross-references (separate follow-up per spec).
- Subgrouping (by location, role, current-vs-former) — explicitly out of scope.
- A `featured` / display-order field — explicitly out of scope.

---

## Summary

| Phase | Scope | Approx. size | Build state at end |
|------|------|------|------|
| 1 | Extract `NpcListRow.svelte` + shared types file; refactor `NpcList.svelte` to use it | Small; pure refactor, no behavior change | Green; filterable index visually unchanged |
| 2 | New `FactionNpcList.svelte` + section wiring on faction detail page | Small–medium; one new component + one page edit | Green; spec acceptance fully met |

# Content Status Fields — Implementation Plan

Implements `docs/specs/content-status-fields.md` in four reviewable phases. Each phase ends in a coherent, buildable state so it can be reviewed and committed before moving on. The spec is intentionally additive and backward-compatible (defaults apply to existing data), so every phase keeps the build green without any data-repo migration.

---

## Resolved decisions

1. **Shared `campaignStatus` fragment location.** No existing convention in `packages/schemas/`. Create a new fragment file `packages/schemas/src/schemas/campaign-status.ts` exporting `CampaignStatusEnum` and a small `isActive` helper. Mirrors how `clue-reference.ts` is structured as a shared fragment.
2. **`visibility` helper location.** `isPlayerVisible(npc)` lives in `npc.ts` next to the existing `getNpcSortKey`, since it's NPC-specific.
3. **GM NPC surface.** The web app is SSR (`output: 'server'`), so role is available at request time via `Astro.locals`. Branch on role inside the existing player route rather than building a parallel `/gm-reference/npcs/` tree. For GM viewers, show all NPCs (including `visibility: gm` ones) with a small `GM-only` badge. For player viewers, filter them out and 404 their detail pages. This is consistent with the spec's "use whatever convention the existing GM-only clue rendering uses" and avoids inventing a new route tree.
4. **Plotline + clue status coexistence.** Plotline already has `status: 'active'|'dormant'|'resolved'` (lifecycle); clue already has `status: 'unknown'|'known'` (player discovery). Both coexist with the new `campaignStatus: 'active'|'inactive'`. The "default-hide inactive" filtering uses `campaignStatus` only; existing filters are untouched. The spec is explicit about this in §"Out of scope".
5. **Faction/plotline list pages — "Show inactive" toggle.** Spec says judgment call. At ship time there will be zero inactive items (no data migration). Phase 4 applies the default-hide filter and leaves a `TODO` for the toggle. Once enough content is marked inactive that the filter is hiding something users want to see, adding the toggle becomes a one-line follow-up.
6. **Build-time validation scope.** Only structured cross-references are validated (`faction.activeAgents[].npcId` → NPC, `plotline.clues[]` → clue). The spec also mentions "GM-only NPC referenced by a player-visible NPC's connection notes" — but NPCs have no structured connection-notes field, so a faithful implementation would require markdown parsing. Phase 4 defers that check with a TODO comment in the validation script.

---

## Phase 1 — Schema + helpers

**Goal:** Add the two new fields and the two helpers to the schemas package. Regenerate JSON schemas. Bump the package. The build stays green because both fields default to backward-compatible values when absent.

### Work

**Schemas package (`packages/schemas/`):**

- Create `src/schemas/campaign-status.ts`:
  ```ts
  import { z } from 'zod';

  export const CampaignStatusEnum = z.enum(['active', 'inactive']);
  export type CampaignStatus = z.infer<typeof CampaignStatusEnum>;

  export function isActive(
    content: { campaignStatus?: CampaignStatus },
  ): boolean {
    return (content.campaignStatus ?? 'active') === 'active';
  }
  ```
- Extend `src/schemas/npc.ts`:
  - Add `visibility: z.enum(['player', 'gm']).default('player')`.
  - Add `campaignStatus: CampaignStatusEnum.default('active')` (import from `campaign-status.js`).
  - Export `isPlayerVisible(npc: { visibility?: 'player' | 'gm' }): boolean`.
- Extend `src/schemas/clue.ts`, `encounter.ts`, `faction.ts`, `plotline.ts`:
  - Add `campaignStatus: CampaignStatusEnum.default('active')` to each.
- Confirm `src/schemas/index.ts` exports the new fragment file (the existing `export * from './…'` covers `npc.js` and the other four; need a new line for `campaign-status.js`).
- Run `npm run build:packages && npm run build:json-schemas` so `dist/` and `dist/*.schema.json` reflect the new fields.
- Add a changeset: minor bump for `@achm/schemas`. Note that the change is additive and backward-compatible — no data migration required.

### Review focus

- All five content schemas gain `campaignStatus`; only NPC gains `visibility`.
- Defaults apply: omitting the fields in YAML continues to validate cleanly (test by re-running `npm run build:web` — no data file should fail).
- `isActive` is exported once, used everywhere; `isPlayerVisible` is exported from `npc.ts`.
- JSON schemas regenerate correctly (grep `dist/npc.schema.json` for `visibility` and `campaignStatus`; grep the other four for `campaignStatus`).
- Changeset note: additive, no data migration.

### Out of scope for this phase

- Any consumption of the new fields in `apps/web/`. Helpers exist, no code uses them yet.
- Build-time validation (Phase 4).

---

## Phase 2 — NPC visibility enforcement

**Goal:** Wire `isPlayerVisible` into the NPC index and detail routes. Players see only player-visible NPCs; GMs see everything with a `GM-only` badge on hidden NPCs. Player-route detail page 404s when accessed for a GM-only NPC by a non-GM user.

### Work

**`apps/web/src/pages/players-reference/setting/npcs/index.astro`:**

- Pull the role via `Astro.locals` and the existing `canAccess` / `SCOPES.GM` utilities (mirror the pattern in `SecretLayout.astro`).
- Filter the loaded NPC entries: if the viewer is not a GM, drop entries where `!isPlayerVisible(entry.data)`.
- Add `visibility` to the projected list item shape so `NpcList.svelte` can render the badge.
- Remove the existing `TODO(npc-status)` comment — replaced by working code (the `campaignStatus` half of that TODO ships in Phase 3).

**`apps/web/src/components/NpcList.svelte`:**

- Add `visibility: 'player' | 'gm'` to `NpcListItem`.
- Render a small `GM-only` badge next to `displayName` when `visibility === 'gm'`. Match the existing Badge component used by `ClueList.svelte` (the `Badge` Svelte component at `apps/web/src/components/Badge.svelte` — used for "Known" / "Review" tags on clues).

**`apps/web/src/pages/players-reference/setting/npcs/[id].astro`:**

- After loading the entry, if the viewer is not a GM and the NPC is not player-visible, return 404 (mirror the existing not-found pattern at lines 28-45).
- For GM viewers loading a GM-only NPC, render the page normally with a `GM-only` indicator next to the title.

### Review focus

- Player-route index excludes GM-only NPCs for player viewers; includes them with a badge for GM viewers.
- Player-route detail 404s for player viewers on GM-only NPCs.
- GM viewers see the badge on both list rows and the detail page title.
- The TODO comment is gone; no half-shipped state.
- Build is green.

### Out of scope for this phase

- Campaign-status filtering (Phase 3).
- Any new dedicated GM route — the role check is in-page.

---

## Phase 3 — Campaign status on filterable index pages

**Goal:** Add a "Show inactive items" checkbox to the three filterable index components (`ClueList.svelte`, `EncounterList.svelte`, `NpcList.svelte`). Inactive items are hidden by default; toggling the checkbox surfaces them with a small `inactive` badge. State serializes to URL via the existing boolean helpers.

This phase touches three components in parallel. Each change follows the same pattern, so reviewing them together is cleaner than splitting.

### Work

**`apps/web/src/utils/url-filter-state.ts`:**

- Already exports `initBooleanFilterFromUrl` and `setBooleanUrlParam`. No changes needed — use as-is.

**For each of `ClueList.svelte`, `EncounterList.svelte`, `NpcList.svelte`:**

- Add `campaignStatus: 'active' | 'inactive'` to the item type.
- Add `showInactive` state: `$state(initBooleanFilterFromUrl('show-inactive'))`, with `$effect(() => setBooleanUrlParam('show-inactive', showInactive))`.
- In the `filtered` computation, drop items where `campaignStatus === 'inactive' && !showInactive`.
- Add a `<label><input type="checkbox" bind:checked={showInactive}></label> Show inactive items` control to the filter row.
- Render an `inactive` badge on rows where `campaignStatus === 'inactive'`. Use the existing `Badge` component (clues already have a similar precedent with the "Known"/"Review" tags).
- Update the `clearFilters()` reset behaviour: explicitly set `showInactive = false` so "Clear" restores the default-hide state, not just a blank URL.

**For each of the three page routes (`session-toolkit/clues/index.astro`, `gm-reference/encounters/index.astro`, `players-reference/setting/npcs/index.astro`):**

- Add `campaignStatus: entry.data.campaignStatus ?? 'active'` to the projected list items, so the component receives a concrete value (uses the default `'active'` even though the schema already defaults; explicit makes the component logic readable).

### Review focus

- All three list pages default-hide inactive items.
- "Show inactive items" toggle surfaces them with the `inactive` badge; toggle state survives reload and back/forward.
- `clearFilters()` returns to default-hide.
- Build green; no regressions to existing filters; URL-param key `show-inactive` is consistent across the three components.

### Out of scope for this phase

- Faction and plotline list pages (Phase 4).
- Build-time validation (Phase 4).

---

## Phase 4 — Faction + plotline list filtering, build-time validation, final polish

**Goal:** Apply the default-hide filter to the two non-filterable list pages (factions, plotlines). Add the prebuild validation script that warns on cross-reference mismatches. Walk the spec's acceptance list end-to-end.

### Work

**Faction list page (`apps/web/src/pages/gm-reference/factions/index.astro`):**

- Filter loaded faction entries to drop those where `!isActive(f.data)` before rendering.
- Leave a `TODO(content-status):` comment noting that a "Show inactive" toggle can be added if inactive volume warrants it. Reference the spec.

**Plotline list page (`apps/web/src/pages/gm-reference/plotlines/index.astro`):**

- Same treatment: filter out `!isActive`, leave the same TODO. Note that this is independent of plotline `status` ('active'/'dormant'/'resolved') — `campaignStatus` is a separate axis.

**Detail pages:** No changes. Per spec, inactive items still render normally on direct links.

**Build-time validation — new script `apps/web/scripts/validate-content-status.ts`:**

- Load all five collections directly via the schemas package and YAML/MDX loaders (mirror the loading pattern from `cache-ap-totals.ts` at `apps/web/scripts/`).
- Walk these structured cross-references and emit `console.warn` (not throw) on mismatches:
  - For each active faction, for each entry in `activeAgents`, if `npcId` is set and the referenced NPC has `campaignStatus: 'inactive'`, warn.
  - For each active faction, for each entry in `activeAgents`, if `npcId` is set and the referenced NPC has `visibility: 'gm'`, warn (the spec calls this out under "GM-only NPC referenced by a player-visible NPC's connection notes" — `activeAgents` is the closest structured analogue today).
  - For each active plotline, for each clue id in `clues`, if the referenced clue has `campaignStatus: 'inactive'`, warn.
- Emit a clear summary at the end (e.g., `⚠ 3 content-status warnings`). Exit code 0 even on warnings — they're informational.
- Leave a TODO at the top of the file noting that the spec also calls for validating "GM-only NPC referenced by a player-visible NPC's connection notes," which would require parsing NPC markdown bodies (no structured field today). Defer.

**Wire the script into `apps/web/scripts/prebuild.sh`:**

- Add `tsx scripts/validate-content-status.ts` to the prebuild chain after the existing validators (around line 49, before `cache-ap-totals.ts`).

**Final acceptance pass:**

- Walk every bullet in the spec's "Acceptance" section:
  - Schema package builds, JSON regenerated, version bumped (Phase 1).
  - Existing content files build without modification (Phase 1).
  - `visibility: gm` on an NPC: removes from player index, 404s player detail, renders with indicator for GMs (Phase 2).
  - `campaignStatus: inactive` on any of the five types: hidden from index/list views by default, "Show inactive" surfaces them with an indicator (Phase 3 + Phase 4).
  - Build-time validation warns on the documented mismatches (Phase 4).
- Run `npm run typecheck`, `npm run build:web`, `npm test`.
- Manually test by setting `visibility: gm` on one NPC and `campaignStatus: inactive` on one item of each type, building, then reverting. (Test in a scratch branch or use the data sandbox.)

### Review focus

- Faction and plotline lists default-hide inactive; TODOs are explicit about deferring the toggle.
- Validation script outputs are readable (clear messages identifying the parent → child reference) and don't break the build.
- The `apps/web/scripts/prebuild.sh` integration is in the right place.
- All five acceptance bullets in the spec are demonstrably satisfied.

### Out of scope for this phase

- Markdown-body parsing for the connection-notes visibility check (TODO in the script).
- A "Show inactive" toggle on faction/plotline list pages (TODO in the page files; trivial follow-up when inactive volume justifies it).
- Any data-repo migration: the spec is additive; nothing requires marking items inactive on day one.

---

## Summary

| Phase | Scope | Approx. size | Build state at end |
|------|------|------|------|
| 1 | Schema fragment + visibility/campaignStatus fields + helpers + JSON regen | Small; mostly additive | Green; defaults apply to all existing data |
| 2 | NPC visibility enforcement: index filter, detail 404, GM-only badge | Small–medium | Green; visibility surfaces working |
| 3 | "Show inactive" toggle + default-hide on ClueList / EncounterList / NpcList | Medium; same pattern × 3 | Green; campaign-status surfaces on filterable pages |
| 4 | Default-hide on faction/plotline lists + build-time validation script + final acceptance pass | Small–medium | Green; all spec acceptance bullets satisfied |

Deferred follow-ups: "Show inactive" toggle on faction/plotline lists, markdown-body parsing for NPC connection-notes visibility validation. Both have TODOs pointing at the spec.

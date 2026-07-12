# NPC Display: Schema Update and Filterable Index

## Context

The data repo migration is happening separately and changes the NPC schema: `name` and `title` are being removed; `displayName` (required string) and `sortName` (optional string) are being added. This brief covers the corresponding code-repo work: updating the schema package to match, updating the existing NPC display logic to use the new fields, and building a filterable index page to replace the current scrolling-prose NPC list.

## Schema package changes (`packages/schemas`)

Update the NPC Zod schema:

- Remove `name` and `title` fields
- Add `displayName: z.string()` (required)
- Add `sortName: z.string().optional()`

Provide a helper, exported from the schemas package:

```ts
export function getNpcSortKey(npc: Npc): string {
  return npc.sortName ?? npc.displayName;
}
```

Use this helper everywhere sort logic touches NPCs — do not inline the fallback. The point is to have one source of truth so future changes (e.g. case-insensitive sorting, ignoring leading articles) live in one place.

Regenerate JSON schemas and bump the schemas package version. Add a CHANGELOG entry noting this is a breaking change requiring matching data repo migration.

## Existing display updates (`packages/web`)

The current NPC index page (`/players-reference/setting/npcs`) and the per-NPC detail pages currently read `name` and (in some places) `title`. Audit all references and replace:

- Any place rendering `npc.name` → render `npc.displayName`
- Any place rendering or concatenating `npc.title` → that field no longer exists; the honorific is already baked into `displayName`
- Any sort logic (`sort((a, b) => a.name.localeCompare(b.name))` or similar) → switch to `getNPCSortKey` from the schemas package

The detail page (`/players-reference/setting/npcs/[id]`) renders `displayName` as the page title.

For the current index page specifically: this page will be replaced (see below), but until the filterable index ships, keep it functional. Once the filterable index is in place, the old page is removed and its route redirects to the new one.

## Filterable index page

Model this on the existing clues and encounters filterable lists — same component patterns, same look and feel, same URL-state behavior (filters survive page reload and back/forward navigation). Do not invent new UI; reuse what's there.

### Route

The new index lives at `/players-reference/setting/npcs` (same path as the existing one — this is a replacement). Per-NPC detail pages at `/players-reference/setting/npcs/[id]` are unchanged.

### List item rendering

Each row shows:

- `displayName` as the primary text
- `occupation` as secondary text below the name
- The NPC's image as a thumbnail, if `image` is set; otherwise a small placeholder or no image (match how the existing index handles missing images)
- Click-through to the detail page

Rows are compact — the goal is a scannable list of names with enough secondary information to disambiguate, not the current full-prose display. Player-facing version only renders player-visible NPCs (see "Status filtering" below); GM-facing version renders all.

### Sorting

Sort by `getNPCSortKey(npc)` (case-insensitive). Group the sorted list under letter headers derived from the first letter of the sort key, so readers see the alphabetical structure even when an NPC's display string starts with a different letter than its sort key ("Sergeant Brenn Hardback" appearing under **H**).

Expose explicit sort controls (a small dropdown or button group at the top of the list):

- Alphabetical by sort key (default)
- Recently updated (descending by file mtime or, if available, a `lastUpdated` frontmatter field — use whatever clues/encounters already use)

Do not ship with an invisible default sort. The point of this rebuild is that the current sort is invisible to readers; the new version must make it explicit.

### Filters

Required filters in v1:

- **Faction.** Multi-select. Source values from the existing `factions` field on NPC frontmatter (this field exists already per the data repo's schema additions; if it doesn't on a given NPC, treat as empty array). Filter logic: an NPC matches if any of its factions appears in the selected set. Faction labels in the filter UI come from the faction data files (`name` field), not from the raw ids.

- **Plotline.** Multi-select. Source from the `plotlines` field if it exists on the NPC schema, otherwise from reverse-lookup: scan plotline files for NPC references. Use whichever mechanism clues already use for the same filter; don't invent a new one.

Defer for v2 (do not build now):

- Species, culture, location, tags. None of these are workflows the GM has identified as useful, and adding them speculatively just creates filter sprawl. Leave space in the layout for them to be added later.

### Status filtering

The data migration adds (separately) `inactive` and `hidden` status flags. Until those land, treat all NPCs as visible. Once they're in the schema:

- `hidden: true` → never rendered on the player-facing route
- `inactive: true` → not rendered by default on either route; a GM-only toggle ("Show inactive") reveals them
- The GM-facing version of this page (gated by the existing GM auth, same as the clue toolkit pages) shows hidden NPCs as well, possibly with a visual indicator

If `inactive`/`hidden` aren't in the schema yet when this page ships, leave a TODO comment and skip the status logic entirely rather than building a half-version.

### URL state

Filter selections, sort choice, and the GM-only "show inactive" toggle (where applicable) serialize to query params. Page reload and back/forward preserve state. Mirror the pattern from the clues filterable list exactly; if that pattern uses a particular query-param library or hook, reuse it.

### Empty states

If filters narrow the list to zero results, show a friendly empty state with a "Clear filters" button. Standard pattern from the other filterable lists.

## What's out of scope

- The data migration itself (separate task in the data repo).
- Adding new filters beyond faction and plotline.
- Changing the NPC detail page beyond the field-rename.
- Building a names-only list page or a separate "All" page — the filterable index replaces both. The existing prose index page is deleted.
- Cross-references from faction pages to their NPCs (the `activeAgents` link rendering on faction pages). That's its own task and can be tackled after this lands.

## Acceptance

- Schema package builds, JSON schemas regenerate, version bumps.
- The NPC index page at `/players-reference/setting/npcs` renders the filterable list described above; the old prose page is gone.
- All existing references to `npc.name` and `npc.title` in the web package are updated; build passes; no TypeScript errors.
- Sort key uses the `getNPCSortKey` helper consistently; "Sergeant Brenn Hardback" appears under H, "Master-at-Arms Kardek" under K, "Commander Law" under L, "Cassio Vandermere" under C.
- Faction and plotline filters work end-to-end with URL state; behavior matches the clues filterable list.

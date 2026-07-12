# Content Status Fields: Visibility and Campaign Status

## Context

Two independent states the schema currently doesn't capture:

- **Visibility** — applies only to NPCs. Most NPCs are player-visible by default; some (Branwen Tull's Syndicate role, secret agents, etc.) should never appear on player-facing pages. Clues, encounters, factions, and plotlines are GM-only by nature and don't need this field.
- **Campaign status** — applies to all five content types (NPCs, clues, encounters, factions, plotlines). The primary purpose is reducing the amount of stale information surfaced when the GM is looking things up. Inactive items still exist in the data; they're just filtered out by default.

This brief adds these fields to the schema package and the matching display logic.

## Schema package changes

In `packages/schemas`, add to the NPC schema:

```ts
visibility: z.enum(["player", "gm"]).default("player"),
```

Add a shared `campaignStatus` field — extracted as a small reusable fragment since it's identical across types — composed into NPCs, clues, encounters, factions, and plotlines:

```ts
campaignStatus: z.enum(["active", "inactive"]).default("active"),
```

Both fields are optional in source YAML/MDX (the default applies when absent). Existing content files require no migration; none of them need either field added.

Regenerate JSON schemas. Bump the schemas package version. Note in the CHANGELOG that this is additive and backward-compatible.

## Display logic

Provide helpers from the schemas package; do not inline the defaults at call sites:

```ts
export function isPlayerVisible(npc: { visibility?: "player" | "gm" }): boolean {
  return (npc.visibility ?? "player") === "player";
}

export function isActive(content: { campaignStatus?: "active" | "inactive" }): boolean {
  return (content.campaignStatus ?? "active") === "active";
}
```

### NPC visibility (player vs. GM)

Player-facing NPC routes filter out NPCs where `isPlayerVisible(npc) === false`:

- The player-facing NPC index page
- Any other player-reference page that aggregates NPCs
- The player-facing detail route: attempting to load a GM-only NPC by id returns 404

GM-facing NPC routes render all NPCs regardless of visibility, with a small visual indicator (label, badge, muted color — use whatever convention the existing GM-only clue rendering uses; if there's no existing convention, a small `GM-only` label next to the name is sufficient).

### Campaign status (across all five content types)

On filterable index pages — currently clues and encounters, with NPCs in progress — inactive items are filtered out by default. The filter UI gets a checkbox: **"Show inactive items."** When checked, inactive items matching the current filter set appear in results alongside active ones, with a small `inactive` indicator. Checkbox state persists in URL query params (same pattern as other filter state).

On non-filterable list pages for content types that have them (faction list, plotline list), inactive items are likewise hidden by default. These pages may or may not need a "Show inactive" toggle depending on volume — judgment call; add the toggle only where there are enough inactive items to make it useful, and leave a TODO comment where it's deferred.

Detail pages render inactive content normally. Inactive items aren't deleted; direct links to them still work.

## Build-time validation

Add a build warning (not error) when an *active* parent references an *inactive* child:

- A faction's `activeAgents` list points at an inactive NPC
- A plotline references an inactive clue, NPC, encounter, or sub-plotline
- A GM-only NPC is referenced by a player-visible NPC's connection notes (visibility mismatch)

Warning rather than error because there are legitimate cases (e.g., a plotline that references shelved content as historical context). The warning catches unintentional inconsistencies without blocking the build.

## Acceptance

- Schema package builds with the new fields; JSON schemas regenerate; version bumps.
- Existing content files build without modification (defaults apply).
- Setting `visibility: gm` on an NPC removes them from the player-facing NPC index and 404s their detail page on the player route; the GM route renders them with an indicator.
- Setting `campaignStatus: inactive` on any of the five content types hides them from index/list views by default; "Show inactive items" surfaces them with an indicator.
- Build-time validation warns on the mismatches described above.

## Out of scope

- Per-content-type status semantics beyond active/inactive. If finer-grained status becomes useful later (e.g., plotline-specific "resolved" vs. "abandoned"), it can be a separate field; `campaignStatus` stays binary.
- The active-agents linking work on faction pages — separate brief.

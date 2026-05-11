# Faction Pages: Render Associated NPCs

## Context

The `factions` array on the NPC schema already exists and is populated for some NPCs. Faction pages currently don't render the NPCs associated with them — the relationship is asserted in the data but invisible in the rendered output. This brief adds that rendering.

The relationship is unidirectional: NPCs declare their factions via the `factions` field; faction pages derive their NPC list by query. There is no `activeAgents` field on the faction schema (or if one exists from earlier schema iterations, this brief includes removing it — see "Schema cleanup" below).

## Display: faction detail page

On each faction's detail page, add a section titled **Associated NPCs** (or similar — match the heading conventions used elsewhere on faction pages).

Query: all NPCs where this faction's id appears in the NPC's `factions` array.

Filter the results:

- Apply `isPlayerVisible` filtering for player-facing routes (GM-only NPCs are excluded from player views; visible on GM routes)
- Apply `isActive` filtering by default (inactive NPCs are hidden unless a "Show inactive" toggle is checked — same pattern as the filterable indexes)

Sort: use `getNPCSortKey` (the same helper used by the filterable NPC index). Consistency across pages matters more than per-page customization.

Render each entry as a compact row matching the filterable NPC index style: `displayName` as primary text, `occupation` as secondary text, thumbnail if `image` is set, click-through to the NPC detail page. Reuse the same row component if one exists; don't fork it.

If the query returns zero results, omit the section entirely rather than rendering an empty heading.

## Display: faction list / index page

No change in v1. If the GM later wants associated-NPC counts on the faction index ("Blackthorn Syndicate — 4 NPCs"), that's a future enhancement.

## Build-time validation

The status-fields brief already specifies a warning when an active parent references an inactive child. That covers this case automatically once both briefs land: an active faction with an inactive NPC declaring it as an affiliation surfaces as a warning.

Add no new validation in this brief.

## Acceptance

- Faction schema no longer has a separate field listing associated NPCs (if one existed); the NPC-side `factions` array is the sole source.
- Each faction detail page renders a list of associated NPCs derived from query, filtered by visibility (player vs. GM route) and `campaignStatus` (active by default, with toggle for inactive).
- Rows use the same display component and sort key as the filterable NPC index.
- Empty results render no section, not an empty heading.

## Out of scope

- Subgrouping NPCs within the faction page (by location, by role, by current/former). Distinctions between NPCs come through in each NPC's own description; the faction page is a flat affiliation list.
- A `featured` or display-order field for prioritizing specific NPCs on the faction page. If this becomes useful later, it's a separate small enhancement.
- Cross-references in the other direction (showing factions on the NPC detail page) — this is its own follow-up if you want it, but isn't currently a stated goal.

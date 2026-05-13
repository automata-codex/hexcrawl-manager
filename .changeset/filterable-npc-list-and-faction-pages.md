---
'@achm/schemas': minor
'@achm/web': minor
---

Filterable NPC index, NPC↔faction cross-linking, and campaign-status-aware
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

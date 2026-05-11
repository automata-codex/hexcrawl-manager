---
'@achm/schemas': major
'@achm/web': minor
---

**Breaking:** Rename NPC `name` / `title` fields to `displayName` /
`sortName`, and add optional `factions` / `plotlines` arrays. Requires a
matching data-repo migration: every NPC YAML must replace its `name`
(plus optional `title`) with a single required `displayName` (the
honorific is folded in), and may add `sortName` for sort-by-surname
behaviour. NPC YAMLs that have not been migrated will fail Zod
validation at collection load.

- **Schema** (`@achm/schemas`):
  - Remove `name` (required string) and `title` (optional string).
  - Add `displayName` (required string).
  - Add `sortName` (optional string) — sort key fallback when an NPC's
    displayName starts with an honorific or article.
  - Add `factions` and `plotlines` (optional `string[]`) to support the
    upcoming filterable NPC index.
  - Export `getNpcSortKey(npc)` — single source of truth for NPC sort
    ordering. Returns `sortName ?? displayName`. Use this everywhere NPC
    sort logic touches the schema; do not inline the fallback.

- **Web** (`@achm/web`): NPC index and detail pages updated to read
  `displayName` instead of `name`/`title`. The honorific subtitle on the
  detail page is removed (the honorific now lives inside `displayName`).
  The existing prose index continues to function with the new fields
  pending its replacement by the filterable index in a follow-up.

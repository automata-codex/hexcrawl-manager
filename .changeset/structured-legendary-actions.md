---
'@achm/schemas': minor
'@achm/web': minor
---

Render legendary actions on stat blocks, and switch the `legendary_actions`
shape from list-of-strings to list-of-`{name, desc}` objects (matching
`reactions` and `lair_actions`).

- **Schema** (`@achm/schemas`): `legendary_actions` is now
  `z.array({ name, desc }).nullable().optional()`. The previous
  list-of-strings form was unstructured and could not be styled
  consistently with reactions or lair actions. Existing data files with
  legendary actions (the three `legion-*` stat blocks plus the new
  `aboleth`) have been migrated.
- **Web** (`@achm/web`): new `LegendaryActions.astro` component, modeled
  on `LairActions.astro`. Uses `legendary_desc` as the intro paragraph
  and renders each action with the italic-bold name styling used by
  reactions and lair actions. `StatBlock.astro` now mounts it between
  `Reactions` and `LairActions`.

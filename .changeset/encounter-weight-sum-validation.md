---
'@achm/schemas': minor
---

Enforce that encounter table weights sum to 20.

GM-facing probabilities for both `mainTable` and tier subtables are displayed
as `weight / 20` (`RandomEncounterTable.astro`, `TierSubtable.astro`) rather
than normalized by the actual total, so any list whose weights don't sum to
20 silently shows the wrong odds. There was previously no enforcement of this
at the schema level — only a non-blocking UI warning (`validateWeightTotal`),
and that was wired up for tier subtables only, not `mainTable`.

- `WeightedCategoryTable` and `TieredSubtableSchema` (`encounter-table.ts`)
  now `.superRefine()` to reject any list whose weights don't sum to exactly
  20, with a message naming the offending tier/table and the actual total.
- `EncounterOverrideSchema` (`encounter-override.ts`) now reuses
  `TieredSubtableSchema` for its `categoryTables` value type instead of a
  duplicate, unrefined inline record, so hex-level `encounterOverrides` get
  the same enforcement as shared `encounter-category-tables/*.yml` files.

Verified against all current campaign data (`validate:refs`, `astro check`)
— nothing existing violates the new constraint.

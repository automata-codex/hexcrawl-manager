---
'@achm/schemas': minor
'@achm/web': minor
---

Allow hexes (and pointcrawl nodes/edges) to reference a shared
encounter-category-table by `tableId` in their `encounterOverrides.categoryTables`,
matching the ability regions and pointcrawls already had — instead of only
inline tiered entries.

- `CategoryTableReference` (`encounter-table.ts`) is a new `{ tableId }` schema;
  `CategoryTable` and `EncounterOverrideSchema.categoryTables` now accept it as
  a union alongside `TieredSubtableSchema` for each category.
- `mergeEncounterOverrides` (`encounters.ts`) treats a `tableId` override as
  replacing the whole category rather than merging into inline tiers, via the
  new `isCategoryTableReference` type guard.
- `RandomEncounterTable.astro` renders a `tableId`-referenced category with
  `ExternalTableContainer` instead of `CategoryContainer`.
- `encounter-usage-tracker.ts` resolves `tableId` references through the
  existing `externalTableMap` so encounter usage tracking stays accurate for
  hex/node/edge overrides, not just regions and pointcrawls.

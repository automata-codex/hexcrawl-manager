---
"@achm/core": minor
"@achm/schemas": minor
"@achm/web": minor
---

### Map and Region Improvements

- **Configurable map label font**: Added `labelFont` option to map grid config (defaults to Source Sans 3)
- **Hex ID display**: Map labels now correctly respect the coordinate notation setting (numeric vs letter-number)
- **Region ID flexibility**: Support both numbered (`region-1`) and named (`skyreach-highlands`) region IDs
  - Numbered regions display as "Region 1: Name"
  - Named regions display as "Region: Name"
  - New functions: `getRegionShortTitle()`, `getRegionFullTitle()`, `getRegionNumber()`
  - Sorting: numbered regions first (numerically), then named regions (alphabetically, ignoring articles)
- **Map-aware neighbors**: `getHexNeighbors()` now accepts optional `MapConfig` to filter by grid bounds and out-of-bounds list

### Style Fixes

- Fixed paragraph spacing in map detail panel, region pages, NPC pages, and rumor details
- Fixed stat block component spacing and colors
- Disabled `svelte/no-useless-mustaches` ESLint rule

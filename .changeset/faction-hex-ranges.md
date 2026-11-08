---
'@achm/core': minor
'@achm/schemas': minor
'@achm/web': minor
---

Faction territory `hexes` now accepts hex ranges, so a faction's claim no
longer has to list every hex individually:

- **Rectangle** `F10:J14` / `0610:1014`: every column × every row between two
  corners (either order).
- **Radius** `M25+2` / `1325+2`: every hex within N steps of a center.
- **Exclusion** `-G12`: any form prefixed with `-` is removed from the claim.
  Order doesn't matter: the result is (all includes) minus (all excludes).

Single hex IDs still work, so existing data is unchanged.

- `@achm/core`: new `expandHexSpecs(specs, mapConfig)` expands specs using the
  map config's notation, grid size and out-of-bounds list. Hexes you type
  (single IDs, corners, centers) must be inside the grid; ranges are clipped to
  the grid and skip out-of-bounds hexes. Radius is capped at the grid's largest
  dimension. Errors are collected per spec rather than thrown.
- `@achm/schemas`: new `HexSpecSchema` (shape check only) used by
  `FactionSchema.hexes`. It restores unquoted numeric-notation IDs that YAML
  parses as numbers (`0101` → 101 → `"0101"`, `-0101` → `"-0101"`).
- `@achm/web`: `/api/map-territories.json` returns expanded hex IDs, and
  `validate:faction-hexes` validates each spec against the map config. Missing
  `map.yaml` is now an error when any faction claims territory.

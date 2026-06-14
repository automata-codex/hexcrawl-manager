---
'@achm/schemas': minor
'@achm/core': minor
'@achm/web': patch
---

Render region and faction territory outlines on the interactive map.

**Schemas** (`@achm/schemas`):

- Add two optional fields to `FactionSchema`. `hexes` is the per-hex territory
  the faction claims; unlike `region.hexes` it is an overlay **claim**, not a
  partition — overlaps across factions are allowed (contested hexes), coverage
  is not exhaustive, and it drives no terrain/biome defaults. `mapColor` is the
  CSS color used to draw that territory's outline on the interactive map. Both
  are additive and backward-compatible; `areaOfOperation` is unchanged.

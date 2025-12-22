---
'@achm/schemas': major
'@achm/core': minor
'@achm/data': minor
'@achm/web': major
'@achm/cli': patch
---

Flexible map configuration

This release makes the hex map system flexible and data-driven rather than hardcoded to specific dimensions.

**Breaking Changes:**
- `regionId` removed from hex schema - regions now own hex membership via `region.hexes[]`
- `region.hexes` is now required (was optional)

**New Features:**
- Centralized coordinate utilities in `@achm/core` with support for `letter-number` and `numeric` notation
- New `map.yaml` configuration file defines grid dimensions and out-of-bounds hexes
- Regions define default `terrain` and `biome` for their hexes
- Hex files are optional - hexes without files inherit region defaults
- Prebuild validation catches configuration errors (duplicate assignments, invalid coordinates)
- Interactive map calculates viewBox from actual hex data
- New "Fit to View" button on interactive map

**Migration:**
- Hex files reorganized from `hexes/region-X/` to `hexes/col-X/` structure
- Region files now include `hexes` array listing member hex IDs
- `regionId` field removed from hex files (derived from region membership)

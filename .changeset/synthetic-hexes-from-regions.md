---
'@achm/web': minor
---

Support synthetic hexes for region-only hex definitions

Hexes can now be defined only at the region level without requiring individual hex files. The web app automatically generates synthetic hex data for these hexes, inheriting terrain and biome from the region.

**New Features:**
- API endpoint `/api/hexes.json` includes synthetic hexes from regions
- Individual hex pages (`/session-toolkit/hexes/[id]`) render region-only hexes
- Hex catalog includes synthetic hexes in listings
- Region hex pages show all hexes including those without files

**New Utilities:**
- `createSyntheticHex(hexId, regionData)` - creates minimal hex data from region defaults
- `resolveHexWithRegion(hex, region)` - applies region fallbacks for terrain/biome
- `getAllRegionHexIds(regions, notation)` - gets all hex IDs referenced by regions

Synthetic hexes display as "Unexplored" with the landmark "This area has not yet been explored."

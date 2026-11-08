---
'@achm/web': minor
---

Each faction's territory is now its own layer on the interactive map. The
**Faction Territory** layer becomes a master switch, with one toggle per
territory-claiming faction indented beneath it in the layers panel. A faction's
outline draws only when both the master switch and its own toggle are on, so
one click still hides all territory, and turning factions off isolates the
rest. Faction toggles default to on, stay clickable (dimmed) while the master
switch is off, and their state persists across reloads like other layers.

- Child layers are generated from `/api/map-territories.json`, so a faction
  gets a toggle automatically once it claims territory; no `map.yaml` change.
- New `utils/map-layers.ts` holds the parent/child layer logic
  (`withChildLayers`, `effectiveVisibility`, `panelOrder`).
- `initializeLayerVisibility` accepts child layers, and the map loads territory
  before initializing layers so saved per-faction toggles are restored.
- `MapOutline` reads the new `effectiveLayerVisibility` store, which applies
  parent gating.

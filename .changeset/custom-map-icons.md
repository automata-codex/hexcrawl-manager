---
'@achm/schemas': minor
'@achm/web': minor
---

Data-driven map icons and layers

This release replaces hardcoded map icon rendering with a flexible, data-driven system configured via `map.yaml`.

**New Features:**
- Icons defined in `map.yaml` with `icons` section (SVG file + default size)
- Tag-based icon rendering via `tagIcons` section (map hex tags to icons with optional styling)
- Per-hex custom icons via `mapIcon` field in hex YAML files
- Campaign-specific layers defined in `map.yaml` with visibility and scope controls
- SVG symbols loaded from both framework icons and `data/map-assets/` directory
- Prebuild validation catches undefined icon/layer references

**Layer System:**
- Framework layers (hex borders, labels, biomes, terrain, rivers, trails) remain hardcoded
- Campaign layers from `map.yaml` render above framework layers
- Custom icons layer renders above campaign layers
- Layers panel displays in visual stacking order (top layer first)
- Layer scopes now properly validated against `ScopeSchema`

**Migration:**
- Campaign-specific icons (e.g., `icon-fort-dagaric.svg`) should move to `data/map-assets/`
- Hardcoded icon rendering replaced with `tagIcons` configuration

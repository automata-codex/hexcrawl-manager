# Data-Driven Map Icons Specification

## Overview

This spec replaces hardcoded map icon rendering (Fort Dagaric, FC cities, scar sites, etc.) with a data-driven system. Icons are defined in `map.yaml` and can be triggered by hex tags or direct per-hex configuration.

## Directory Structure

```
data/
├── map.yaml                    # Icon definitions, tag mappings, layers
├── map-assets/
│   ├── icon-fort-dagaric.svg   # Campaign-specific icons
│   ├── icon-first-civ.svg      # First Civilization marker (campaign-specific)
│   └── icon-custom-thing.svg
└── hexes/
    └── region-8/
        └── v17.yaml            # Uses tags or mapIcon

apps/web/src/components/InteractiveMap/
└── icons/
    ├── icon-mountains.svg      # Framework terrain icons
    ├── icon-hills.svg
    └── icon-wetlands.svg
```

## Schema Changes

### 1. Map Config Schema

**File:** `packages/schemas/src/schemas/map-config.ts`

```typescript
import { z } from 'zod';

export const CoordinateNotationSchema = z.enum(['letter-number', 'numeric']);
export type CoordinateNotation = z.infer<typeof CoordinateNotationSchema>;

export const GridConfigSchema = z.object({
  columns: z.number().int().positive().max(26),
  rows: z.number().int().positive(),
  notation: CoordinateNotationSchema.default('letter-number'),
});

/**
 * Icon definition - maps a key to an SVG file with default styling.
 */
export const IconDefinitionSchema = z.object({
  file: z.string().describe('SVG filename in map-assets/ or framework icons/'),
  size: z.number().positive().default(40).describe('Default width/height in pixels'),
});

/**
 * Tag-to-icon mapping - renders an icon on all hexes with a given tag.
 */
export const TagIconSchema = z.object({
  tag: z.string().describe('Hex tag to match'),
  icon: z.string().describe('Icon key from the icons section'),
  size: z.number().positive().optional().describe('Override default icon size'),
  stroke: z.string().optional().describe('SVG stroke color'),
  strokeWidth: z.number().positive().optional().default(4),
  fill: z.string().optional().describe('SVG fill color'),
  layer: z.string().describe('Layer key for visibility toggle'),
});

/**
 * Layer configuration for the layers panel.
 */
export const LayerConfigSchema = z.object({
  key: z.string().describe('Unique layer identifier'),
  label: z.string().describe('Human-readable label for UI'),
  defaultVisible: z.boolean().default(true),
  scopes: z.array(z.string()).optional().describe('Required scopes to see this layer'),
});

/**
 * Full map configuration from map.yaml.
 */
export const MapConfigSchema = z.object({
  grid: GridConfigSchema,
  outOfBounds: z.array(z.string()).default([]),
  icons: z.record(z.string(), IconDefinitionSchema).default({}).describe(
    'Icon definitions keyed by icon name'
  ),
  tagIcons: z.array(TagIconSchema).default([]).describe(
    'Mappings from hex tags to icons'
  ),
  layers: z.array(LayerConfigSchema).default([]).describe(
    'Layer visibility configuration'
  ),
});

export type GridConfig = z.output<typeof GridConfigSchema>;
export type IconDefinition = z.infer<typeof IconDefinitionSchema>;
export type TagIcon = z.infer<typeof TagIconSchema>;
export type LayerConfig = z.infer<typeof LayerConfigSchema>;
export type MapConfig = z.output<typeof MapConfigSchema>;
```

### 2. Hex Schema Addition

**File:** `packages/schemas/src/schemas/hex.ts`

Add the `mapIcon` field for direct per-hex icon configuration:

```typescript
/**
 * Direct map icon configuration for a specific hex.
 * Use this for one-off icons that don't map to a reusable tag.
 * For reusable icons, prefer adding a tag and defining a tagIcon in map.yaml.
 */
export const HexMapIconSchema = z.object({
  icon: z.string().describe('Icon key from map.yaml icons section'),
  size: z.number().positive().optional().describe('Override default icon size'),
  stroke: z.string().optional().describe('SVG stroke color'),
  strokeWidth: z.number().positive().optional(),
  fill: z.string().optional().describe('SVG fill color'),
  layer: z.string().default('customIcons').describe('Layer key for visibility toggle'),
});

export type HexMapIcon = z.infer<typeof HexMapIconSchema>;

// Add to HexSchema:
export const HexSchema = z.object({
  // ... existing fields ...
  mapIcon: HexMapIconSchema.optional().describe(
    'Direct icon configuration; for reusable icons, prefer tags + tagIcons in map.yaml'
  ),
});
```

## Example Configuration

### map.yaml

```yaml
grid:
  columns: 23
  rows: 27
  notation: letter-number

icons:
  # Campaign-specific icons (files in data/map-assets/)
  first-civ:
    file: icon-first-civ.svg
    size: 25

  fort-dagaric:
    file: icon-fort-dagaric.svg
    size: 80

  dragon-lair:
    file: icon-dragon.svg
    size: 50

tagIcons:
  # Party's home base
  - tag: party-base
    icon: fort-dagaric
    layer: fortDagaric

  # First Civilization sites
  - tag: scar-site
    icon: first-civ
    stroke: black
    fill: "#E5F20D"
    layer: scarSites

  - tag: fc-ruins
    icon: first-civ
    stroke: "#0DCAF2"
    fill: "#0DCAF2"
    layer: fcRuins

  - tag: fc-city
    icon: first-civ
    stroke: "#0DCAF2"
    fill: white
    layer: fcCities

  # Dragon lairs
  - tag: dragon-lair
    icon: dragon-lair
    fill: red
    layer: dragonLairs

layers:
  - key: labels
    label: Hex Labels
    defaultVisible: true

  - key: fortDagaric
    label: Fort Dagaric
    defaultVisible: true

  - key: trail
    label: Trails
    defaultVisible: true

  - key: river
    label: Rivers
    defaultVisible: true

  - key: terrain
    label: Terrain
    defaultVisible: true

  - key: hexBorders
    label: Hex Borders
    defaultVisible: true

  - key: biomes
    label: Biomes
    defaultVisible: true

  - key: fcCities
    label: F.C. Cities
    defaultVisible: false
    scopes:
      - gm

  - key: fcRuins
    label: F.C. Ruins
    defaultVisible: false
    scopes:
      - gm

  - key: scarSites
    label: Scar Sites
    defaultVisible: false
    scopes:
      - gm

  - key: conduit
    label: F.C. Conduits
    defaultVisible: false
    scopes:
      - gm

  - key: dragonLairs
    label: Dragon Lairs
    defaultVisible: false
    scopes:
      - gm

  - key: customIcons
    label: Custom Icons
    defaultVisible: true
```

### Hex with Tag (Recommended Approach)

```yaml
# data/hexes/region-8/v17.yaml
id: v17
slug: v17
name: Fort Dagaric
landmark:
  description: Fort Dagaric. See the roleplay book for rumors.
terrain: plains
biome: boreal-forest
isVisited: true
isExplored: true
tags:
  - party-base  # Triggers fort-dagaric icon via tagIcons config
```

### Hex with Direct mapIcon (Escape Hatch)

```yaml
# data/hexes/region-12/z99.yaml
id: z99
name: The Anomaly
landmark: A shimmering rift in reality
tags:
  - planar-rift
mapIcon:
  icon: portal        # Uses portal icon
  size: 45            # Custom size
  fill: "#FF00FF"     # Custom color
  layer: customIcons
```

## SVG Symbols Plugin Update

**File:** `apps/web/src/plugins/svg-symbols-plugin.mjs`

```javascript
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** @returns {import('vite').Plugin} */
export default function svgSymbolsPlugin() {
  return {
    name: 'virtual-svg-symbols',
    resolveId(id) {
      return id === 'virtual:svg-symbols' ? id : null;
    },
    load(id) {
      if (id === 'virtual:svg-symbols') {
        const frameworkIconDir = resolve('src/components/InteractiveMap/icons');
        const dataPath = process.env.ACHM_DATA_PATH || '../../data';
        const dataIconDir = resolve(dataPath, 'map-assets');

        const loadSymbols = (dir) => {
          if (!existsSync(dir)) return [];
          return readdirSync(dir)
            .filter((file) => file.endsWith('.svg'))
            .map((file) => ({
              name: file,
              content: readFileSync(resolve(dir, file), 'utf-8'),
            }));
        };

        // Load from both directories
        // Data icons with same filename override framework icons
        const frameworkIcons = loadSymbols(frameworkIconDir);
        const dataIcons = loadSymbols(dataIconDir);

        const iconMap = new Map();
        for (const icon of frameworkIcons) {
          iconMap.set(icon.name, icon.content);
        }
        for (const icon of dataIcons) {
          iconMap.set(icon.name, icon.content);
        }

        const symbols = Array.from(iconMap.values()).join('\n');
        return `export default \`<defs>${symbols}</defs>\`;`;
      }
    },
  };
}
```

## Map.svelte Rendering Changes

### Remove Hardcoded Functions

Delete:
- `getFortDagaricCoords()`
- Hardcoded `layer-fort-dagaric-icon` group
- Hardcoded `layer-scar-sites` group
- Hardcoded `layer-fc-ruins` group
- Hardcoded `layer-fc-cities` group

### Add Data-Driven Rendering

```svelte
<script lang="ts">
  // ... existing imports ...

  // Assume mapConfig is fetched and includes icons, tagIcons, layers
  let mapConfig: MapConfig = $state(/* loaded from API */);

  /**
   * Get all unique layer keys that have tag icons or direct hex icons.
   */
  function getIconLayerKeys(): string[] {
    const layers = new Set<string>();

    // From tagIcons config
    for (const tagIcon of mapConfig.tagIcons) {
      layers.add(tagIcon.layer);
    }

    // From direct hex mapIcons
    for (const hex of hexes) {
      if (hex.mapIcon) {
        layers.add(hex.mapIcon.layer ?? 'customIcons');
      }
    }

    return Array.from(layers);
  }

  /**
   * Get hexes that match a tag icon definition.
   */
  function getHexesForTagIcon(tagIcon: TagIcon): HexPlayerData[] {
    return hexes.filter((hex) => {
      if (!hex.tags) return false;
      // Exclude hexes with direct mapIcon (they render separately)
      if (hex.mapIcon) return false;
      return hex.tags.includes(tagIcon.tag);
    });
  }

  /**
   * Get hexes with direct mapIcon for a specific layer.
   */
  function getHexesWithDirectIcon(layerKey: string): HexPlayerData[] {
    return hexes.filter((hex) => {
      if (!hex.mapIcon) return false;
      return (hex.mapIcon.layer ?? 'customIcons') === layerKey;
    });
  }

  /**
   * Resolve icon definition from map config.
   */
  function getIconDef(iconKey: string): IconDefinition | undefined {
    return mapConfig.icons[iconKey];
  }
</script>

<!-- Tag-based icons -->
{#each mapConfig.tagIcons as tagIcon (tagIcon.tag)}
  <g
    id={`layer-${tagIcon.layer}-${tagIcon.tag}`}
    style:display={!$layerVisibility[tagIcon.layer] ? 'none' : undefined}
  >
    {#each getHexesForTagIcon(tagIcon) as hex (hex.id)}
      {#if isValidHexId(hex.id, notation)}
        {@const { q, r } = parseHexId(hex.id, notation)}
        {@const { x, y } = axialToPixel(q, r)}
        {@const iconDef = getIconDef(tagIcon.icon)}
        {@const size = tagIcon.size ?? iconDef?.size ?? 40}
        <use
          href={`#${iconDef?.file.replace('.svg', '')}`}
          x={x - size / 2}
          y={y - size / 2}
          width={size}
          height={size}
          stroke={tagIcon.stroke}
          stroke-width={tagIcon.strokeWidth ?? 4}
          fill={tagIcon.fill}
        />
      {/if}
    {/each}
  </g>
{/each}

<!-- Direct hex mapIcons (rendered after tag icons, takes precedence) -->
{#each getIconLayerKeys() as layerKey (layerKey)}
  <g
    id={`layer-${layerKey}-direct`}
    style:display={!$layerVisibility[layerKey] ? 'none' : undefined}
  >
    {#each getHexesWithDirectIcon(layerKey) as hex (hex.id)}
      {#if isValidHexId(hex.id, notation) && hex.mapIcon}
        {@const { q, r } = parseHexId(hex.id, notation)}
        {@const { x, y } = axialToPixel(q, r)}
        {@const iconDef = getIconDef(hex.mapIcon.icon)}
        {@const size = hex.mapIcon.size ?? iconDef?.size ?? 40}
        <use
          href={`#${iconDef?.file.replace('.svg', '')}`}
          x={x - size / 2}
          y={y - size / 2}
          width={size}
          height={size}
          stroke={hex.mapIcon.stroke}
          stroke-width={hex.mapIcon.strokeWidth ?? 4}
          fill={hex.mapIcon.fill}
        />
      {/if}
    {/each}
  </g>
{/each}
```

### Layer Visibility Store Update

**File:** `apps/web/src/stores/interactive-map/layer-visibility.ts`

The store uses a **hybrid approach** where framework layers are hardcoded and campaign layers are loaded from `map.yaml`:

```typescript
import { writable } from 'svelte/store';
import type { LayerConfig } from '@achm/schemas';

/**
 * Framework layers - always present, rendered below campaign layers.
 * These are fundamental map features that every campaign uses.
 */
const frameworkLayers: LayerConfig[] = [
  { key: 'labels', label: 'Hex Labels', defaultVisible: true },
  { key: 'terrain', label: 'Terrain', defaultVisible: true },
  { key: 'biomes', label: 'Biomes', defaultVisible: true },
  { key: 'hexBorders', label: 'Hex Borders', defaultVisible: true },
  { key: 'river', label: 'Rivers', defaultVisible: true },
  { key: 'trail', label: 'Trails', defaultVisible: true },
];

/**
 * Custom icons layer - always present, rendered above campaign layers.
 * Used for direct hex mapIcon rendering.
 */
const customIconsLayer: LayerConfig = {
  key: 'customIcons',
  label: 'Custom Icons',
  defaultVisible: true,
};

export const layerConfigStore = writable<LayerConfig[]>([]);
export const layerVisibility = writable<Record<string, boolean>>({});

/**
 * Initialize layer visibility from campaign config.
 * Merges: framework layers + campaign layers + customIcons layer.
 */
export function initializeLayerVisibility(campaignLayers: LayerConfig[]): void {
  const allLayers = [...frameworkLayers, ...campaignLayers, customIconsLayer];
  layerConfigStore.set(allLayers);
  // ... merge with localStorage, set visibility
}
```

**Layer ordering in the panel:**
1. Framework layers (labels, terrain, biomes, hexBorders, river, trail)
2. Campaign layers (from map.yaml - fortDagaric, scarSites, etc.)
3. Custom Icons layer

## Implementation Phases

### Phase 1: Schema and Plugin Updates
1. Add new schema types to `map-config.ts`
2. Add `mapIcon` field to hex schema
3. Update `svg-symbols-plugin.mjs` to load from `data/map-assets/`
4. Export new types from `@achm/schemas`

**Commit:** `feat(schemas): add map icons configuration schema`

### Phase 2: Migrate Fort Dagaric
1. Create `data/map-assets/` directory
2. Move `icon-fort-dagaric.svg` to `data/map-assets/`
3. Add `icons` and `tagIcons` sections to `map.yaml`
4. Add `party-base` tag to v17.yaml
5. Remove `getFortDagaricCoords()` and hardcoded rendering

**Commit:** `refactor: migrate Fort Dagaric to data-driven icon`

### Phase 3: Migrate Tag-Based Icons
1. Move `icon-first-civ.svg` to `data/map-assets/`
2. Add `scar-site`, `fc-ruins`, `fc-city` to `tagIcons` in `map.yaml`
3. Remove hardcoded `layer-scar-sites`, `layer-fc-ruins`, `layer-fc-cities` groups
4. Update rendering to use data-driven approach

**Commit:** `refactor: migrate FC icons to data-driven tagIcons`

### Phase 4: Hybrid Layer System
1. Add campaign-specific `layers` section to `map.yaml` (fortDagaric, scarSites, etc.)
2. Update `layer-visibility.ts` with hybrid approach:
   - Hardcoded framework layers (labels, terrain, biomes, hexBorders, river, trail)
   - Campaign layers from `map.yaml`
   - Hardcoded customIcons layer (rendered on top)
3. Update `LayersPanel.svelte` to use `layerConfigStore`
4. Update `Map.svelte` to call `initializeLayerVisibility(config.layers)`

**Commit:** `refactor: implement hybrid layer visibility system`

### Phase 5: Cleanup
1. Remove unused constants (`DAGARIC_ICON_SIZE`, `FC_ICON_SIZE`)
2. Remove `filterHexesByTag` function (if no longer needed)
3. Verify no framework code references moved icons
4. Update tests and documentation

**Commit:** `chore: remove deprecated icon constants and helpers`

## Migration Notes

- Campaign-specific icons (`icon-fort-dagaric.svg`, `icon-first-civ.svg`) move to `data/map-assets/`
- Existing hex tags (`scar-site`, `fc-city`, `fc-ruins`) don't need to change—only the rendering config moves to `map.yaml`
- The framework ships with only terrain icons (`icon-mountains.svg`, `icon-hills.svg`, etc.)
- Example data can include sample `tagIcons` configuration that campaigns can customize
- **Hybrid layer system:** Framework layers (labels, terrain, biomes, hexBorders, river, trail) are hardcoded; campaign layers are defined in `map.yaml`; customIcons layer is hardcoded and rendered on top

## Open Questions

1. **Icon file resolution:** Should the `file` field support paths, or always look in `map-assets/` first then `icons/`? Current proposal: just filename, plugin handles resolution order.

2. **Layer ordering:** Should `tagIcons` array order determine render order? Probably yes—later entries render on top.

3. **Validation:** Should we validate that icon keys in `tagIcons` and `mapIcon` reference defined icons? Yes, as a prebuild validation step.

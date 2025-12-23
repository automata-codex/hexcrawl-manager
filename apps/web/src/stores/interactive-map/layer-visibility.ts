import { writable } from 'svelte/store';

import { STORAGE_KEYS } from '../../utils/constants.ts';

import type { LayerConfig } from '@achm/schemas';

/**
 * Framework layers - always present, rendered below campaign layers.
 * These are fundamental map features that every campaign uses.
 */
const frameworkLayers: LayerConfig[] = [
  { key: 'hexBorders', label: 'Hex Borders', defaultVisible: true },
  { key: 'labels', label: 'Hex Labels', defaultVisible: true },
  { key: 'biomes', label: 'Biomes', defaultVisible: true },
  { key: 'terrain', label: 'Terrain', defaultVisible: true },
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

/**
 * Store for the full layer configuration (framework + campaign + customIcons).
 * This is set when map config is fetched.
 */
export const layerConfigStore = writable<LayerConfig[]>([]);

/**
 * Store for layer visibility state.
 * Merges config defaults with localStorage overrides.
 */
export const layerVisibility = writable<Record<string, boolean>>({});

/**
 * Initialize layer visibility from campaign config.
 * Merges framework layers, campaign layers, and customIcons layer.
 * Should be called after fetching map config.
 */
export function initializeLayerVisibility(campaignLayers: LayerConfig[]): void {
  // Merge: framework layers + campaign layers (reversed to match visual stacking) + customIcons
  // Config files list top-most layer first, so we reverse to get bottom-first for rendering
  const allLayers = [...frameworkLayers, ...[...campaignLayers].reverse(), customIconsLayer];

  // Update the config store
  layerConfigStore.set(allLayers);

  // Build initial visibility from config defaults
  const defaults = Object.fromEntries(
    allLayers.map((layer) => [layer.key, layer.defaultVisible]),
  );

  // Load saved overrides from localStorage
  const saved =
    typeof localStorage !== 'undefined'
      ? JSON.parse(localStorage.getItem(STORAGE_KEYS.LAYER_VISIBILITY) || '{}')
      : {};

  // Merge defaults with saved values (saved takes precedence)
  const merged: Record<string, boolean> = { ...defaults };
  for (const key of Object.keys(saved)) {
    if (key in defaults) {
      merged[key] = saved[key];
    }
  }

  layerVisibility.set(merged);
}

// Persist visibility changes to localStorage
layerVisibility.subscribe((val) => {
  if (typeof localStorage !== 'undefined' && Object.keys(val).length > 0) {
    localStorage.setItem(STORAGE_KEYS.LAYER_VISIBILITY, JSON.stringify(val));
  }
});

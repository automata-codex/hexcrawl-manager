import { writable } from 'svelte/store';
import { STORAGE_KEYS } from '../../utils/constants.ts';

export interface LayerMetadata {
  key: string;
  label: string;
  defaultVisible: boolean;
}

export const layerList: LayerMetadata[] = [
  { key: 'labels', label: 'Hex Labels', defaultVisible: true },
  { key: 'terrain', label: 'Terrain', defaultVisible: true },
  { key: 'hexBorders', label: 'Hex Borders', defaultVisible: true },
  { key: 'biomes', label: 'Biomes', defaultVisible: false },
  { key: 'vegetation', label: 'Vegetation', defaultVisible: true },
];

const initial = Object.fromEntries(
  layerList.map(layer => [layer.key, layer.defaultVisible])
);

const saved = typeof localStorage !== 'undefined'
  ? JSON.parse(localStorage.getItem(STORAGE_KEYS.LAYER_VISIBILITY) || '{}')
  : {};

export const layerVisibility = writable({
  ...initial,
  ...saved,
});

layerVisibility.subscribe(val => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.LAYER_VISIBILITY, JSON.stringify(val));
  }
});

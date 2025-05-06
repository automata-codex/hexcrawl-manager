import { writable } from 'svelte/store';
import { STORAGE_KEYS } from '../../utils/constants.ts';

export interface LayerMetadata {
  key: string;
  label: string;
  defaultVisible: boolean;
}

export const layerList: LayerMetadata[] = [
  { key: 'vegetation', label: 'Vegetation', defaultVisible: true },
  { key: 'terrain', label: 'Terrain', defaultVisible: true },
  { key: 'labels', label: 'Hex Labels', defaultVisible: true },
  { key: 'highlights', label: 'Highlights', defaultVisible: false },
  { key: 'debug', label: 'Debug Overlay', defaultVisible: false },
  { key: 'hexBorders', label: 'Hex Borders', defaultVisible: true },
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

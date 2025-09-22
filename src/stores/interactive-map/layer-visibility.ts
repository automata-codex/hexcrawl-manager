import { writable } from 'svelte/store';

import { SCOPES, STORAGE_KEYS } from '../../utils/constants.ts';

import type { Scope } from '../../types.ts';

export interface LayerMetadata {
  key: string;
  label: string;
  defaultVisible: boolean;
  scopes?: Scope[];
}

export const layerList: LayerMetadata[] = [
  { key: 'labels', label: 'Hex Labels', defaultVisible: true },
  { key: 'fortDagaric', label: 'Fort Dagaric', defaultVisible: true },
  { key: 'trail', label: 'Trails', defaultVisible: true },
  {
    key: 'fcCities',
    label: 'F.C. Cities',
    defaultVisible: false,
    scopes: [SCOPES.GM],
  },
  {
    key: 'fcRuins',
    label: 'F.C. Ruins',
    defaultVisible: false,
    scopes: [SCOPES.GM],
  },
  {
    key: 'scarSites',
    label: 'F.C. Scar Sites',
    defaultVisible: false,
    scopes: [SCOPES.GM],
  },
  {
    key: 'conduit',
    label: 'F.C. Conduits',
    defaultVisible: false,
    scopes: [SCOPES.GM],
  },
  { key: 'river', label: 'Rivers', defaultVisible: true },
  { key: 'terrain', label: 'Terrain', defaultVisible: true },
  { key: 'hexBorders', label: 'Hex Borders', defaultVisible: true },
  { key: 'elevation', label: 'Elevation', defaultVisible: false },
  { key: 'biomes', label: 'Biomes', defaultVisible: true },
];

const initial = Object.fromEntries(
  layerList.map((layer) => [layer.key, layer.defaultVisible]),
);

const saved =
  typeof localStorage !== 'undefined'
    ? JSON.parse(localStorage.getItem(STORAGE_KEYS.LAYER_VISIBILITY) || '{}')
    : {};

export const layerVisibility = writable({
  ...initial,
  ...saved,
});

layerVisibility.subscribe((val) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.LAYER_VISIBILITY, JSON.stringify(val));
  }
});

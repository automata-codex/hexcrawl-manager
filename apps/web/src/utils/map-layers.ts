import type { LayerConfig } from '@achm/schemas';

/**
 * A layer as the map UI sees it. A layer with a `parent` is a child layer: it
 * has its own toggle, but only draws when its parent is also on, so the parent
 * acts as a master switch for the group.
 */
export interface MapLayer extends LayerConfig {
  parent?: string;
}

/** Campaign layer key that acts as the master switch for faction territory. */
export const FACTION_TERRITORY_LAYER = 'factionTerritory';

/** Layer key for one faction's territory outline. */
export function factionTerritoryLayerKey(factionId: string): string {
  return `${FACTION_TERRITORY_LAYER}:${factionId}`;
}

/**
 * Insert each child layer directly after its parent, keeping the list in
 * bottom-first render order. Children inherit the parent's scopes unless they
 * set their own. Children whose parent is not in `layers` are dropped, so a
 * campaign without the parent layer gets no orphaned toggles.
 */
export function withChildLayers(
  layers: MapLayer[],
  children: MapLayer[],
): MapLayer[] {
  return layers.flatMap((layer) => [
    layer,
    ...children
      .filter((child) => child.parent === layer.key)
      .map((child) => ({ ...child, scopes: child.scopes ?? layer.scopes })),
  ]);
}

/**
 * Visibility after applying parent gating: a child layer is visible only when
 * both it and its parent are on. Top-level layers are unchanged.
 */
export function effectiveVisibility(
  layers: MapLayer[],
  visibility: Record<string, boolean>,
): Record<string, boolean> {
  const result = { ...visibility };
  for (const layer of layers) {
    if (layer.parent) {
      result[layer.key] = Boolean(visibility[layer.parent] && visibility[layer.key]);
    }
  }
  return result;
}

/**
 * Order for the layers panel: top-level layers top-most first (the reverse of
 * render order), each followed by its children in their original order.
 */
export function panelOrder(layers: MapLayer[]): MapLayer[] {
  return layers
    .filter((layer) => !layer.parent)
    .reverse()
    .flatMap((parent) => [
      parent,
      ...layers.filter((layer) => layer.parent === parent.key),
    ]);
}

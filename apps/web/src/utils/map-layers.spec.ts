import { describe, expect, it } from 'vitest';

import {
  effectiveVisibility,
  FACTION_TERRITORY_LAYER,
  factionTerritoryLayerKey,
  panelOrder,
  withChildLayers,
} from './map-layers.ts';

import type { MapLayer } from './map-layers.ts';

const layer = (key: string, extra: Partial<MapLayer> = {}): MapLayer => ({
  key,
  label: key,
  defaultVisible: true,
  ...extra,
});

const child = (key: string, parent: string, extra: Partial<MapLayer> = {}) =>
  layer(key, { parent, ...extra });

const keys = (layers: MapLayer[]) => layers.map((l) => l.key);

describe('factionTerritoryLayerKey', () => {
  it('namespaces the faction ID under the master layer', () => {
    expect(factionTerritoryLayerKey('revenant-legion')).toBe(
      `${FACTION_TERRITORY_LAYER}:revenant-legion`,
    );
  });
});

describe('withChildLayers', () => {
  it('places children directly after their parent, in order', () => {
    const result = withChildLayers(
      [layer('a'), layer('territory'), layer('b')],
      [child('t:x', 'territory'), child('t:y', 'territory')],
    );
    expect(keys(result)).toEqual(['a', 'territory', 't:x', 't:y', 'b']);
  });

  it('drops children whose parent is missing', () => {
    expect(keys(withChildLayers([layer('a')], [child('t:x', 'territory')]))).toEqual(['a']);
  });

  it("inherits the parent's scopes unless the child sets its own", () => {
    const result = withChildLayers(
      [layer('territory', { scopes: ['gm:view'] })],
      [child('t:x', 'territory'), child('t:y', 'territory', { scopes: ['player:view'] })],
    );
    expect(result[1].scopes).toEqual(['gm:view']);
    expect(result[2].scopes).toEqual(['player:view']);
  });

  it('returns the layers unchanged when there are no children', () => {
    expect(keys(withChildLayers([layer('a'), layer('b')], []))).toEqual(['a', 'b']);
  });
});

describe('effectiveVisibility', () => {
  const layers = [layer('territory'), child('t:x', 'territory'), child('t:y', 'territory'), layer('a')];

  it('shows a child only when both it and its parent are on', () => {
    expect(
      effectiveVisibility(layers, { territory: true, 't:x': true, 't:y': false, a: true }),
    ).toEqual({ territory: true, 't:x': true, 't:y': false, a: true });
  });

  it('hides every child when the parent is off, without touching their own toggles', () => {
    const visibility = { territory: false, 't:x': true, 't:y': true, a: true };
    expect(effectiveVisibility(layers, visibility)).toEqual({
      territory: false,
      't:x': false,
      't:y': false,
      a: true,
    });
    expect(visibility['t:x']).toBe(true);
  });

  it('treats a missing toggle as off', () => {
    expect(effectiveVisibility(layers, { territory: true })['t:x']).toBe(false);
  });
});

describe('panelOrder', () => {
  it('lists top-level layers top-most first with children under their parent', () => {
    const layers = withChildLayers(
      [layer('bottom'), layer('territory'), layer('top')],
      [child('t:x', 'territory'), child('t:y', 'territory')],
    );
    expect(keys(panelOrder(layers))).toEqual(['top', 'territory', 't:x', 't:y', 'bottom']);
  });
});

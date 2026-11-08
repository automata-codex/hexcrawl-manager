import { expandHexSpecs } from '@achm/core';
import { loadMapConfig, mapConfigExists } from '@achm/data';
import { getCollection } from 'astro:content';

import { getCurrentUserRole } from '../../utils/auth.ts';
import { SECURITY_ROLE } from '../../utils/constants.ts';

import type { APIRoute } from 'astro';

export interface MapTerritory {
  id: string;
  name: string;
  color: string;
  /** Individual hex IDs, already expanded from the faction's hex specs. */
  hexes: string[];
}

/**
 * Fallback outline color for factions that claim territory but set no `mapColor`.
 * Neutral gray so the territory still renders; factions are expected to set their
 * own `mapColor` for a recognizable color.
 */
const DEFAULT_TERRITORY_COLOR = '#888888';

export const GET: APIRoute = async ({ locals }) => {
  const role = getCurrentUserRole(locals);
  let territories: MapTerritory[] = [];

  // Faction territory is GM-only; players get an empty feed. Hex specs can
  // only be expanded against a map config, so without one there is nothing
  // to draw (the map itself requires the config).
  if (role === SECURITY_ROLE.GM && mapConfigExists()) {
    const config = loadMapConfig();
    const factionEntries = await getCollection('factions');
    territories = factionEntries
      .map((entry) => {
        // Bad specs are reported by validate:faction-hexes; render the rest.
        const { hexes } = expandHexSpecs(entry.data.hexes ?? [], config);
        return {
          id: entry.data.id,
          name: entry.data.name,
          color: entry.data.mapColor ?? DEFAULT_TERRITORY_COLOR,
          hexes,
        };
      })
      .filter((territory) => territory.hexes.length > 0);
  }

  return new Response(JSON.stringify(territories), {
    headers: { 'Content-Type': 'application/json' },
  });
};

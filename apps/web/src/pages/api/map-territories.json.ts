import { getCollection } from 'astro:content';

import { getCurrentUserRole } from '../../utils/auth.ts';
import { SECURITY_ROLE } from '../../utils/constants.ts';

import type { APIRoute } from 'astro';

export interface MapTerritory {
  id: string;
  name: string;
  color: string;
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

  // Faction territory is GM-only; players get an empty feed.
  if (role === SECURITY_ROLE.GM) {
    const factionEntries = await getCollection('factions');
    territories = factionEntries
      .filter((entry) => (entry.data.hexes?.length ?? 0) > 0)
      .map((entry) => ({
        id: entry.data.id,
        name: entry.data.name,
        color: entry.data.mapColor ?? DEFAULT_TERRITORY_COLOR,
        hexes: entry.data.hexes ?? [],
      }));
  }

  return new Response(JSON.stringify(territories), {
    headers: { 'Content-Type': 'application/json' },
  });
};

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getCurrentUserRole } from '../../utils/auth.ts';
import { SECURITY_ROLE, UNKNOWN_CONTENT } from '../../utils/constants.ts';
import type { HexData } from '../../types.ts';

type HexPlayerData = Pick<
  HexData,
  | 'id'
  | 'name'
  | 'landmark'
  | 'regionId'
  | 'terrain'
  | 'biome'
  | 'elevation'
  | 'isVisited'
  | 'isExplored'
>;

export const GET: APIRoute = async ({ locals }) => {
  const hexEntries = await getCollection('hexes');
  const fullHexes = hexEntries.map((entry) => entry.data);

  const role = getCurrentUserRole(locals);

  const hexes: HexPlayerData[] = fullHexes
    .map(hex => {
      if (role === SECURITY_ROLE.GM) {
        return hex;
      }

      // Redact fields for players
      if (hex.isVisited) {
        return {
          id: hex.id,
          name: hex.name,
          landmark: hex.landmark,
          regionId: hex.regionId,
          terrain: hex.terrain,
          biome: hex.biome,
          elevation: hex.elevation,
          isVisited: hex.isVisited,
          isExplored: hex.isExplored,
        };
      }

      return {
        id: hex.id,
        name: UNKNOWN_CONTENT,
        landmark: UNKNOWN_CONTENT,
        regionId: hex.regionId,
        terrain: UNKNOWN_CONTENT,
        biome: UNKNOWN_CONTENT,
        elevation: -1,
        isVisited: hex.isVisited,
        isExplored: hex.isExplored,
      };
    });

  return new Response(JSON.stringify(hexes), {
    headers: { 'Content-Type': 'application/json' },
  });
};

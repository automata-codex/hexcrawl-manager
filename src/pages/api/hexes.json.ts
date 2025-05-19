import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import type { ExtendedHexData } from '../../types.ts';
import { getCurrentUserRole } from '../../utils/auth.ts';
import { SECURITY_ROLE, UNKNOWN_CONTENT } from '../../utils/constants.ts';
import { processHex } from '../../utils/hexes.ts';

export type HexPlayerData = Pick<
  ExtendedHexData,
  | 'id'
  | 'name'
  | 'landmark'
  | 'regionId'
  | 'terrain'
  | 'biome'
  | 'elevation'
  | 'isVisited'
  | 'isExplored'
  | 'renderedLandmark'
  | 'tags'
>;

export const GET: APIRoute = async ({ locals }) => {
  const hexEntries = await getCollection('hexes');
  const fullHexes = hexEntries.map((entry) => entry.data);

  const role = getCurrentUserRole(locals);

  const hexes: HexPlayerData[] = await Promise.all(
    fullHexes
      .map(async (hex) => {
        const data = await processHex(hex);
        if (role === SECURITY_ROLE.GM) {
          return data;
        }

        // Redact fields for players
        if (hex.isVisited) {
          return {
            id: data.id,
            name: data.name,
            landmark: data.landmark,
            regionId: data.regionId,
            terrain: data.terrain,
            biome: data.biome,
            elevation: data.elevation,
            isVisited: data.isVisited,
            isExplored: data.isExplored,
            renderedLandmark: data.renderedLandmark,
            flags: data.flags,
          };
        }

        return {
          id: data.id,
          name: UNKNOWN_CONTENT,
          landmark: UNKNOWN_CONTENT,
          regionId: data.regionId,
          terrain: UNKNOWN_CONTENT,
          biome: UNKNOWN_CONTENT,
          elevation: -1,
          isVisited: data.isVisited,
          isExplored: data.isExplored,
          renderedLandmark: UNKNOWN_CONTENT,
        };
      }),
  );

  return new Response(JSON.stringify(hexes), {
    headers: { 'Content-Type': 'application/json' },
  });
};

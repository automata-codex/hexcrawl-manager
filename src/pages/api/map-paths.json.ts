import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import type { SegmentMetadataData } from '../../types.ts';
import { getCurrentUserRole } from '../../utils/auth.ts';
import { SECURITY_ROLE } from '../../utils/constants.ts';

const ALLOWED_PLAYER_TYPES = ['river'];

export interface MapPathPlayerData {
  id: string;
  label?: string;
  points: string[];
  type: string;
  segmentMetadata?: Record<string, SegmentMetadataData>;
}

export const GET: APIRoute = async ({ locals }) => {
  const dungeonEntries = await getCollection('map-paths');
  const role = getCurrentUserRole(locals);

  const mapPaths = dungeonEntries.map((entry) => {
    const path = entry.data;
    // console.log(path);

    if (role === SECURITY_ROLE.GM) {
      return path;
    }

    if (!ALLOWED_PLAYER_TYPES.includes(path.type)) {
      return null;
    }

    // Redact fields for players
    // if (path.segmentMetadata) {
    //   console.log(path.id, path.segmentMetadata);
    // }
    return {
      id: path.id,
      label: path.label,
      segmentMetadata: path.segmentMetadata,
      points: path.points,
      type: path.type,
    };
  }).filter((path) => path !== null);

  return new Response(JSON.stringify(mapPaths), {
    headers: { 'Content-Type': 'application/json' },
  });
};

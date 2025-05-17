import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import type { SegmentMetadataData, TrailEntry } from '../../types.ts';
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

function convertTrailsToPaths(trailEntries: TrailEntry[]): MapPathPlayerData[] {
  return trailEntries.map((entry) => {
    return {
      id: `${entry.data.from}-${entry.data.to}`,
      label: `trail-${entry.data.from}-${entry.data.to}`,
      points: [
        `${entry.data.from}:center`,
        `${entry.data.to}:center`,
      ],
      type: 'trail',
    };
  });
}

export const GET: APIRoute = async ({ locals }) => {
  const pathEntries = await getCollection('map-paths');
  const role = getCurrentUserRole(locals);
  const trailEntries = await getCollection('trails');

  const paths: MapPathPlayerData[] = [
    ...convertTrailsToPaths(trailEntries),
    ...pathEntries.map((entry) => entry.data),
  ]

  const mapPaths = paths.map((path) => {
    if (role === SECURITY_ROLE.GM) {
      return path;
    }

    if (!ALLOWED_PLAYER_TYPES.includes(path.type)) {
      return null;
    }

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

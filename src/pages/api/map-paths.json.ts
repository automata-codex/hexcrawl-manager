import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { parseTrailId } from '../../../lib/trails';
import type { SegmentMetadataData, TrailEntry } from '../../types.ts';
import { getCurrentUserRole } from '../../utils/auth.ts';
import { SECURITY_ROLE } from '../../utils/constants.ts';

const ALLOWED_PLAYER_TYPES = ['river', 'trail'];

export interface MapPathPlayerData {
  id: string;
  label?: string;
  points: string[];
  type: string;
  segmentMetadata?: Record<string, SegmentMetadataData>;
}

function convertTrailsToPaths(trailEntries: TrailEntry[]): MapPathPlayerData[] {
  return trailEntries.map((entry) => {
    const hexIds = parseTrailId(entry.id);
    if (!hexIds) {
      throw new Error(`Invalid trail id: ${entry.id}`);
    }
    const { from, to } = hexIds;
    return {
      id: `${entry.id}`,
      label: `trail-${entry.id}`,
      points: [
        `${from}:center`,
        `${to}:center`,
      ],
      type: 'trail',
    };
  });
}

export const GET: APIRoute = async ({ locals }) => {
  const pathEntries = await getCollection('map-paths');
  const role = getCurrentUserRole(locals);
  const trailEntryCollection = await getCollection('trails');
  const trailEntries = trailEntryCollection.map((entry) => entry.data);

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

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getCurrentUserRole } from '../../utils/auth.ts';
import { SECURITY_ROLE } from '../../utils/constants.ts';

export const GET: APIRoute = async ({ locals }) => {
  const hexEntries = await getCollection('hexes');
  const fullHexes = hexEntries.map((entry) => entry.data);

  const role = getCurrentUserRole(locals);

  const hexes = fullHexes.map(hex => {
    if (role === SECURITY_ROLE.GM) {
      return hex;
    }

    // Redact fields for players
    return {
      // TODO Improve logic in here; we'll also need the map to handle missing hexes
      id: hex.id,
      name: hex.name,
      landmark: hex.landmark,
      regionId: hex.regionId,
    };
  });

  return new Response(JSON.stringify(hexes), {
    headers: { 'Content-Type': 'application/json' },
  });
};

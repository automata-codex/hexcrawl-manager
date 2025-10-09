import { getCollection } from 'astro:content';

import { getCurrentUserRole } from '../../utils/auth.ts';
import { SECURITY_ROLE } from '../../utils/constants.ts';

import type { APIRoute } from 'astro';

export interface DungeonEssentialData {
  id: string;
  hexId: string;
  name: string;
}

export const GET: APIRoute = async ({ locals }) => {
  const role = getCurrentUserRole(locals);
  let dungeons: DungeonEssentialData[] = [];

  // Only return info if the user is GM
  if (role === SECURITY_ROLE.GM) {
    const dungeonEntries = await getCollection('dungeons');
    dungeons = dungeonEntries.map((entry) => entry.data);
  }

  return new Response(JSON.stringify(dungeons), {
    headers: { 'Content-Type': 'application/json' },
  });
};

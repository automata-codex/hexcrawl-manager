import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getCurrentUserRole } from '../../utils/auth.ts';
import { SECURITY_ROLE } from '../../utils/constants.ts';

export interface DungeonEssentialData {
  id: string;
  hexId: string;
  name: string;
}

export const GET: APIRoute = async ({ locals }) => {
  const dungeonEntries = await getCollection('dungeons');
  const role = getCurrentUserRole(locals);

  const dungeons = dungeonEntries.map((entry) => {
    const dungeon = entry.data;
    if (role === SECURITY_ROLE.GM) {
      return dungeon;
    }

    // Redact fields for players
    return {
      id: dungeon.id,
      hexId: dungeon.hexId,
      name: dungeon.name,
    };
  });

  return new Response(JSON.stringify(dungeons), {
    headers: { 'Content-Type': 'application/json' },
  });
};

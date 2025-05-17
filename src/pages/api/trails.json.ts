import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const trailEntries = await getCollection('trails');

  const trails = trailEntries.map((entry) => {
      return entry.data;
  });

  return new Response(JSON.stringify(trails), {
    headers: { 'Content-Type': 'application/json' },
  });
}

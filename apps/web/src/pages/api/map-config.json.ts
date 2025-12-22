import { loadMapConfig } from '@achm/data';

import type { MapConfig } from '@achm/schemas';
import type { APIRoute } from 'astro';

export type MapConfigResponse = MapConfig;

export const GET: APIRoute = async () => {
  const config = loadMapConfig();

  return new Response(JSON.stringify(config), {
    headers: { 'Content-Type': 'application/json' },
  });
};

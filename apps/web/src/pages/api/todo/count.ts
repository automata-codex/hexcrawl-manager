import type { APIRoute } from 'astro';

import { getCurrentUserRole } from '../../../utils/auth';
import { SECURITY_ROLE } from '../../../utils/constants';
import { getTodoCounts } from '../../../utils/load-todos';

export const GET: APIRoute = ({ locals }) => {
  const role = getCurrentUserRole(locals);

  if (role !== SECURITY_ROLE.GM) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const counts = getTodoCounts();

  return new Response(JSON.stringify(counts), {
    headers: { 'Content-Type': 'application/json' },
  });
};

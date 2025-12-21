import { info, error } from '@achm/cli-kit';

import { loadPlan, deletePlan } from '../../lib/core/fast-travel-plan';
import { requireSession } from '../../services/general';

import type { Context } from '../../types';

export default function fastTravelAbort(ctx: Context) {
  if (!requireSession(ctx)) {
    return;
  }

  const plan = loadPlan(ctx.sessionId!);
  if (!plan) {
    error('No active fast travel plan to abort.');
    return;
  }

  deletePlan(ctx.sessionId!);
  info(`Fast travel to ${plan.destHex} aborted.`);
}

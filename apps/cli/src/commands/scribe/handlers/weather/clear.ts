import { info } from '@achm/cli-kit';

import type { Context } from '../../types.ts';

export default function weatherClear(ctx: Context) {
  if (ctx.weatherDraft) {
    ctx.weatherDraft.overrides.descriptors = [];
    info('Weather draft descriptors cleared.');
  } else {
    info('No weather draft to clear.');
  }
}

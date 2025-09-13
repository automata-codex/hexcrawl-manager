import type { Context } from '../../types.ts';
import { info } from '../../lib/report.ts';

export default function weatherClear(ctx: Context) {
  if (ctx.weatherDraft) {
    ctx.weatherDraft.descriptors = [];
    info('Weather draft descriptors cleared.');
  } else {
    info('No weather draft to clear.');
  }
}

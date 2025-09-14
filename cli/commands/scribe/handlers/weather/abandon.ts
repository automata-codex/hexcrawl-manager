import type { Context } from '../../types.ts';
import { info } from '../../lib/report.ts';

export default function weatherAbandon(ctx: Context) {
  ctx.weatherDraft = undefined;
  info('Weather draft abandoned.');
}

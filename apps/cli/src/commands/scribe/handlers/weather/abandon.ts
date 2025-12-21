import { info } from '@achm/cli-kit';

import type { Context } from '../../types.ts';

export default function weatherAbandon(ctx: Context) {
  ctx.weatherDraft = undefined;
  info('Weather draft abandoned.');
}

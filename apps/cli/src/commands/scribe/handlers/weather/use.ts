import { info, error, usage } from '@skyreach/cli-kit';

import type { Context } from '../../types.ts';

export default function weatherUse(ctx: Context, args: string[]) {
  const draft = ctx.weatherDraft;
  if (!draft) {
    error('No weather draft to use. Run `weather roll` first.');
    return;
  }
  if (args.length < 2) {
    usage('Usage: weather use <idx[,idx,...]>');
    return;
  }
  const indices = args[1]
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => n >= 1 && n <= 3);
  if (indices.length === 0) {
    error('Descriptor indices must be 1, 2, or 3.');
    return;
  }
  if (!draft.overrides.descriptors) {
    draft.overrides.descriptors = [];
  }
  let added = 0;
  for (const idx of indices) {
    const desc = draft.proposed.suggestedDescriptors[idx - 1];
    if (desc && !draft.overrides.descriptors.includes(desc)) {
      draft.overrides.descriptors.push(desc);
      info(`Descriptor '${desc}' added to overrides.`);
      added++;
    } else if (desc) {
      info(`Descriptor '${desc}' already present in overrides.`);
    }
  }
  if (added === 0) {
    info('No new descriptors added.');
  }
}

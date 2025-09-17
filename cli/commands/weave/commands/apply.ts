import { loadMeta, resolveInputFile } from '../lib/input';

export async function apply(fileArg?: string, opts?: any) {
  const meta = loadMeta();

  // Use shared input helper for file selection
  const file = await resolveInputFile(fileArg, meta, opts);

  // TODO: implement apply logic

  // eslint-disable-next-line no-console
  console.log('apply called', file, opts);
}

import {
  isRolloverFile,
  isSessionFile,
  loadHavens,
  loadMeta,
  loadTrails,
  resolveInputFile,
} from '../lib/input';

export async function apply(fileArg?: string, opts?: any) {
  const trails = loadTrails();
  const meta = loadMeta();
  const havens = loadHavens();

  // Use shared input helper for file selection
  const file = await resolveInputFile(fileArg, meta, opts);

  // File type detection
  if (isRolloverFile(file)) {
    // TODO: implement rollover apply logic
    // eslint-disable-next-line no-console
    console.log('apply: detected rollover file', file);
  } else if (isSessionFile(file)) {
    // TODO: implement session apply logic
    // eslint-disable-next-line no-console
    console.log('apply: detected session file', file);
  } else {
    // eslint-disable-next-line no-console
    console.error('Unrecognized file type for apply:', file);
    process.exit(4);
  }
}

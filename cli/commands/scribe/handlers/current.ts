import type { Context } from '../types';

import status from './status';

export default function current(ctx: Context) {
  const runStatus = status(ctx);
  return (args: string[]) => runStatus(args);
}

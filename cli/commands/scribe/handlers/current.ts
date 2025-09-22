import status from './status';

import type { Context } from '../types';

export default function current(ctx: Context) {
  const runStatus = status(ctx);
  return (args: string[]) => runStatus(args);
}

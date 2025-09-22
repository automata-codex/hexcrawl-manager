import day from './day';

import type { Context } from '../types';

export default function rest(ctx: Context) {
  const runDay = day(ctx);
  return (args: string[]) => {
    return runDay(['end', ...args]);
  };
}

import type { Context } from '../types';
import day from './day';

export default function rest(ctx: Context) {
  const runDay = day(ctx);
  return (args: string[]) => {
    return runDay(['end', ...args]);
  };
}

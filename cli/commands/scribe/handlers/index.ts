import { HELP_TEXT } from '../constants';
import { info } from '../lib/report.ts';
import type { Context } from '../types';

import ap from './ap';
import current from './current';
import day from './day.ts';
import exit from './exit';
import finalize from './finalize';
import help from './help';
import move from './move';
import note from './note';
import party from './party';
import quit from './quit';
import resume from './resume';
import start from './start';
import trail from './trail';
import undo from './undo';
import view from './view';

export type Handler = (args: string[]) => void | Promise<void>;
export type HandlerMap = Record<string, Handler>;

export function buildHandlers(ctx: Context, presetSessionId?: string): HandlerMap {
  return {
    ap: ap(ctx),
    current: current(ctx),
    day: day(ctx),
    exit: exit(),
    finalize: finalize(ctx),
    help: help(),
    move: move(ctx),
    note: note(ctx),
    party: party(ctx),
    quit: quit(),
    resume: resume(ctx),
    start: start(ctx, presetSessionId),
    trail: trail(ctx),
    undo: undo(ctx),
    view: view(ctx),
  };
}

export function showHelp() {
  info(HELP_TEXT);
}

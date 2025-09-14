import { HELP_TEXT } from '../constants';
import { info } from '../lib/report.ts';
import type { Context } from '../types';

import ap from './ap';
import backtrack from './backtrack';
import current from './current';
import date from './date.ts';
import day from './day.ts';
import deadReckoning from './deadReckoning.ts';
import exit from './exit';
import finalize from './finalize';
import help from './help';
import move from './move';
import note from './note';
import party from './party';
import quit from './quit';
import rest from './rest';
import resume from './resume';
import scout from './scout';
import start from './start';
import status from './status.ts';
import time from './time.ts';
import trail from './trail';
import undo from './undo';
import view from './view';
import weather from './weather';

export type Handler = (args: string[]) => void | Promise<void>;
export type HandlerMap = Record<string, Handler>;

export function buildHandlers(ctx: Context, presetSessionId?: string): HandlerMap {
  return {
    ap: ap(ctx),
    backtrack: backtrack(ctx),
    current: current(ctx),
    date: date(ctx),
    day: day(ctx),
    deadRec: deadReckoning(ctx), // Register as 'deadRec' (will be mapped to 'dead-rec')
    exit: exit(),
    finalize: finalize(ctx),
    help: help(),
    move: move(ctx),
    note: note(ctx),
    party: party(ctx),
    quit: quit(),
    rest: rest(ctx),
    resume: resume(ctx),
    scout: scout(ctx),
    start: start(ctx, presetSessionId),
    status: status(ctx),
    time: time(ctx),
    trail: trail(ctx),
    undo: undo(ctx),
    view: view(ctx),
    weather: weather(ctx),
  };
}

export function showHelp() {
  info(HELP_TEXT);
}

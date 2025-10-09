import { info } from '@skyreach/cli-kit';

import { HELP_TEXT } from '../help-text';

import abort from './abort';
import ap from './ap';
import backtrack from './backtrack';
import current from './current';
import date from './date';
import day from './day';
import deadReckoning from './deadReckoning';
import doctor from './doctor';
import exit from './exit';
import finalize from './finalize';
import help from './help';
import move from './move';
import note from './note';
import party from './party';
import quit from './quit';
import rest from './rest';
import resume from './resume';
import rollover from './rollover';
import scout from './scout';
import start from './start';
import status from './status';
import time from './time';
import trail from './trail';
import undo from './undo';
import view from './view';
import weather from './weather';

import type { Context } from '../types';

// eslint-disable-next-line no-unused-vars
export type Handler = (args: string[]) => void | Promise<void>;
export type HandlerMap = Record<string, Handler>;

export function buildHandlers(ctx: Context): HandlerMap {
  return {
    abort: abort(ctx),
    ap: ap(ctx),
    backtrack: backtrack(ctx),
    current: current(ctx),
    date: date(ctx),
    day: day(ctx),
    'dead-rec': deadReckoning(ctx),
    doctor: doctor(),
    exit: exit(),
    finalize: finalize(ctx),
    help: help(),
    move: move(ctx),
    note: note(ctx),
    party: party(ctx),
    quit: quit(),
    rest: rest(ctx),
    resume: resume(ctx),
    rollover: rollover(ctx),
    scout: scout(ctx),
    start: start(ctx),
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

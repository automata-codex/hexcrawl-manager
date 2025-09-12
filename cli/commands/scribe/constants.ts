import type { Pace, Pillar, Tier } from './types.ts';

export const HELP_TEXT = `
Commands:
  ap <pillar> <tier> "<note...>" record an advancement-point event
  current                        print the current hex
  date <new date>                set or correct the current calendar date
  day end                        end the current day and show a summary
  day start [date]               start a new in-game day (auto-increments date if omitted)
  exit                           leave the shell
  finalize                       freeze session → logs/sessions/<id>.jsonl
  help                           show this help
  move <to> [pace]               record a move (pace: fast|normal|slow)
  note "<text...>"               add a note
  party add <id>                 add a character (TAB to autocomplete)
  party clear                    remove all characters
  party list                     list active characters
  party remove <id>              remove one character by id (TAB to autocomplete)
  quit                           leave the shell
  rest                           end the current day and show a summary (alias for \`day end\`)
  resume [sessionId]             resume the latest (or the specified) in-progress session
  start <hex>                    start a new session using default/preset id
  start <sessionId> <hex>        start with explicit session id
  time <hours>                   log active time (rounded up to 1.5h segments)
  trail <hex>                    mark a trail from current hex to <hex>
  undo [n]                       remove last n in-progress events (default 1)
  view [n]                       show last n events (default 10)
`;

export const HEX_RE = /^[A-Za-z][0-9]+$/;

export const PACES: readonly Pace[] = ['fast', 'normal', 'slow'] as const;

export const PILLARS: readonly Pillar[] = ['explore', 'social', 'combat'] as const;

export const TIERS: readonly Tier[] = [1, 2, 3, 4] as const;

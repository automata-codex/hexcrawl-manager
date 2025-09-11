export const ALLOWED_PILLARS = ['explore', 'social', 'combat'] as const;

export const ALLOWED_TIERS = [1, 2, 3, 4] as const;

export const HEX_RE = /^[A-Za-z][0-9]+$/;

export const HELP_TEXT = `
Commands:
  ap <pillar> <tier> "<note...>" record an advancement-point event
  current                        print the current hex
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
  resume [sessionId]             resume the latest (or the specified) in-progress session
  start <hex>                    start a new session using default/preset id
  start <sessionId> <hex>        start with explicit session id
  trail <hex>                    mark a trail from current hex to <hex>
  undo [n]                       remove last n in-progress events (default 1)
  view [n]                       show last n events (default 10)
`;

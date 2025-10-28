export const HELP_TEXT = `
Commands:
  abort                          abandon the current session (deletes in-progress file)
  ap <pillar> <tier> "<note...>" record an advancement-point event
  backtrack [pace]               move back to the previous hex, clearing lost status (pace: slow|normal)
  current                        show current session status (alias for \`status\`)
  date <new date>                set or correct the current calendar date
  day end                        end the current day and show a summary
  day start [date]               start a new in-game day (auto-increments date if omitted)
  dead-rec <success|fail>        record a dead reckoning attempt (clears lost state on success)
  exit                           leave the shell
  explore                        record exploration of the current hex
  fast <dest> <pace>             plan and execute fast travel along trails (pace: fast|normal|slow)
  fast abort                     cancel active fast travel plan
  fast resume                    resume paused fast travel
  fast status                    show active fast travel plan
  finalize                       freeze session → logs/sessions/<id>.jsonl
  help                           show this help
  move <to> [lost] [pace]        record a move (pace: fast|normal|slow)
  note "<text...>"               add a note
  party add <id>                 add a character (TAB to autocomplete)
  party clear                    remove all characters
  party guest                    add a guest PC (prompts for names)
  party list                     list active characters
  party remove <id>              remove one character by id (TAB to autocomplete)
  quit                           leave the shell
  rest                           end the current day and show a summary (alias for \`day end\`)
  resume [sessionId]             resume the latest (or the specified) in-progress session
  scout <HEX_ID> [landmark]      record scouting of an adjacent hex
  start <hex>                    start a new session
  status                         show current session status
  time <hours|3h>                log active time (accepts "3" or "3h" format)
  todo "<text...>"               add a todo item for post-session processing
  trail <hex>                    mark a trail from current hex to <hex>
  undo [n]                       remove last n in-progress events (default 1)
  view [n]                       show last n events (default 10)
  weather abandon                discard the weather draft (no log write)
  weather clear                  clear chosen descriptors from the draft
  weather commit                 commit the draft as today's weather (writes to log)
  weather propose                alias for \`weather roll\`
  weather roll                   propose today's weather (auto-roll, suggest descriptors)
  weather set <field> <value>    set a field in the weather draft (season, roll, forecast, category, detail, desc)
  weather show                   display today's weather draft and committed weather
  weather use <idx[,idx,...]>    add suggested descriptor(s) by index to the draft
`;

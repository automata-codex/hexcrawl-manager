# `scribe` — Spec (v1.1)

## Purpose

Interactive REPL for in-session logging, note-taking, and session management. Used by the GM to record moves, events, and notes during play, producing structured logs for later processing by `weave`.

## CLI Model

* `scribe` launches an interactive shell (REPL) with command completion and history.
* Commands are entered one at a time; each is parsed and handled immediately.
* Session state is maintained in-memory and written to log files as needed.
* Exiting the shell finalizes the session or discards it, depending on user commands.

## Session & Logging Model

* Each session is associated with a unique session ID and log file.
* Actions (moves, notes, events) are appended to the session log in JSONL format.
* Session logs are later finalized and consumed by `weave` for campaign state updates.

## Commands

The following commands are available in the REPL (see handlers for details):

- `abort` — Abort the current session (discard log).
- `backtrack` — Backtrack to the previous hex (when the party is lost).
- `current` — Show current hex/position.
- `day` / `date` / `time` — Log calendar/time events.
- `doctor` — Run session log validation checks.
- `exit` / `quit` — Exit the REPL.
- `finalize` — Finalize and close the session log (splits multi-season logs if needed).
- `help` — Show help text.
- `move` — Record a party move (from/to/pace).
- `note` — Add a freeform note to the log.
- `party` — Manage party members.
- `rest` / `resume` — Log rest periods and resumptions.
- `scout` — Record scouting actions.
- `start` — Begin a new session (creates a new log file). See also `start interactive` for power-user overrides.
- `status` — Show current session/log status.
- `trail` — Mark a trail between hexes.
- `undo` — Undo or revert the last action(s).
- `view` — View the current log.
- `weather` — Log or display weather.

## State & Files

* Session logs: `sessions/session_<SEQ>_<DATE>.jsonl` (one per session)
* Temporary/in-progress files may be created during a session.
* Finalized logs are consumed by `weave`.

## Error Handling

* Unknown commands print a warning but do not exit the shell.
* Handler errors are caught and reported; the shell remains active.
* Exiting the shell without finalizing may prompt for confirmation or discard the session.

## Implementation Hints

* Use a context object to track session state, file handles, and calendar.
* Tokenize input lines to parse commands and arguments.
* Provide command completion and history for usability.
* Post-command hooks (e.g., weather reminders) can be added for session flavor.
* All commands should be idempotent and safe to repeat as needed.

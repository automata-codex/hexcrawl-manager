# `scribe start` Command Spec

## Overview

Initializes or resumes a scribe session event log, creating an in-progress file if needed and recording the session start event.

## Inputs

- **Arguments** (array of strings):
  - `args[0]`: Either a hex ID (e.g., `P13`) or a session ID (e.g., `session-19`), depending on argument count.
  - `args[1]` (optional): Hex ID, if a session ID is provided as the first argument.
- **Context object** (`ctx`):
  - Used to store `sessionId` and `file` (in-progress file path) for the session.
- **Optional**: `presetSessionId` (string) may be provided to override default session ID.

## Behavior

1. **Argument Parsing**:
   - If no arguments: prints usage and exits.
   - If one argument: treats as hex ID, uses `presetSessionId` or today's date (YYYY-MM-DD) as session ID.
   - If two arguments: treats as `[sessionId, hex]`.
   - If hex is invalid: prints error and exits.
2. **Session File Handling**:
   - Sets `ctx.sessionId` and `ctx.file` (in-progress file path).
   - If the in-progress file does not exist:
     - Appends a `session_start` event with `{ status: 'in-progress', id, startHex }`.
     - Prints `started: {id} @ {startHex}`.
   - If the in-progress file exists:
     - Reads all events from the file.
     - Determines the current hex (via `selectCurrentHex`), falling back to the provided hex if not found.
     - Prints `resumed: {id} ({eventCount} events) — last hex {hex}` (if hex is available).

## Outputs

- **On new session**: Prints `started: {sessionId} @ {startHex}`.
- **On resume**: Prints `resumed: {sessionId} ({eventCount} events) — last hex {hex}` (if hex is available).
- **On error**: Prints error message for invalid hex or usage.

## Event Assumptions

- The in-progress file is a JSONL event log.
- The first event for a new session is always `session_start`.
- No other events are written by this command.

## File Writes

- **Input/Output**: In-progress file at `data/session-logs/in-progress/{sessionId}.jsonl`.
- **Event Appended**: Only on new session, a `session_start` event is appended.

## Filename Patterns

- **In-progress file**: `data/session-logs/in-progress/{sessionId}.jsonl`

## Failure Conditions

- No arguments: prints usage and exits.
- Invalid hex: prints error and exits.
- If file system write fails, error is not explicitly handled (may throw).

## Implicit Cursors

- No explicit cursor or pointer is maintained; only the current hex is determined for resume message.

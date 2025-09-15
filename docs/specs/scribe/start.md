# `scribe start` Command Spec

## Overview

Initializes or resumes a scribe session event log, creating an in-progress file if needed and recording the session start event. Enforces production and development filename conventions, manages session sequence numbers, and reserves session IDs with file locks. Session IDs are always auto-generated and match the filename.

## Inputs

- **Arguments** (array of strings):
  - `args[0]`: Hex ID (e.g., `P13`), required.
- **Context object** (`ctx`):
  - Used to store `sessionId` and `file` (in-progress file path) for the session.
- **Dev mode**: If `--dev` flag is present or the environment variable `SKYREACH_DEV` is set to `"true"`, dev namespace is used.

## Behavior

1. **Argument Parsing**:
   - If no arguments: prints usage and exits.
   - If one argument: treats as hex ID.
   - If hex is invalid: prints error and exits.
2. **Session ID and Filename Generation**:
   - **Production**: Session ID and filename are auto-generated as `session_<SEQ>_<YYYY-MM-DD>`, where `<SEQ>` is a zero-padded integer (e.g., `session_0012_2025-09-15`).
   - **Dev mode**: Session ID and filename are `dev_<ISO>`, where `<ISO>` is the ISO timestamp (no user component).
   - The session ID is always the same as the filename (without `.jsonl`).
3. **Filename Enforcement**:
   - **Production**: Session files are named as `session_<SEQ>_<YYYY-MM-DD>.jsonl`.
   - **Dev mode**: Files are written to `sessions/_dev/` as `dev_<ISO>.jsonl` (never touch `nextSessionSeq`).
4. **Session Sequence Management (Production only)**:
   - Reads `data/meta.yaml: meta.nextSessionSeq` (1-based) to determine the next available session sequence number.
   - Reserves the sequence number on start by creating a lock file: `sessions/.locks/session_<SEQ>.lock`.
   - Does **not** increment `nextSessionSeq` on abort or empty session.
   - `nextSessionSeq` is incremented only on successful finalize.
5. **Session File Handling**:
   - Sets `ctx.sessionId` and `ctx.file` (in-progress file path) for the session.
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

- **Production**: In-progress file at `data/session-logs/in-progress/session_<SEQ>_<YYYY-MM-DD>.jsonl`.
- **Dev mode**: In-progress file at `data/session-logs/sessions/_dev/dev_<ISO>.jsonl`.
- **Lock file**: `data/session-logs/sessions/.locks/session_<SEQ>.lock` (production only).
- **Event Appended**: Only on new session, a `session_start` event is appended.

## Filename Patterns

- **Production**: `session_<SEQ>_<YYYY-MM-DD>.jsonl` (zero-padded, e.g., `session_0007_2025-09-15.jsonl`).
- **Dev mode**: `dev_<ISO>.jsonl` in `_dev/`.
- **Lock file**: `.locks/session_<SEQ>.lock`.

## Failure Conditions

- No arguments: prints usage and exits.
- Invalid hex: prints error and exits.
- If file system write fails, error is not explicitly handled (may throw).
- If lock file cannot be created, aborts session start.

## Implicit Cursors

- No explicit cursor or pointer is maintained; only the current hex is determined for resume message.

## Related Commands

- **`scribe doctor`**: Reports next session sequence, stale locks, files crossing season boundaries, and presence of dev files.

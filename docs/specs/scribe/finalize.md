# `finalize` Command Spec

## Overview

Finalizes an in-progress scribe session event log, ensuring it is complete and writing a canonical session file.

## Inputs

- **Context object** (`ctx`) with:
  - `sessionId`: The session identifier (string, required).
  - `file`: Path to the in-progress event log file (string, required).

## Event Assumptions

- The in-progress file is a JSONL event log containing events of type `Event`.
- Events may include (but are not limited to):
  - `session_start`
  - `day_start`
  - `move`
  - `trail`
- The log may or may not already contain a `session_end` event.

## Behavior

1. **Guards**: Command aborts if either `sessionId` or `file` is missing from context.
2. **Event Finalization**:
   - Reads all events from the in-progress file.
   - If no `session_end` event is present, appends a `session_end` event with `payload: { status: 'final' }` and a new sequence number.
3. **Sorting**:
   - Events are sorted by:
     1. Timestamp (`ts`), ascending (if present).
     2. Sequence number (`seq`), ascending (if present).
     3. Original file order (as fallback).
   - After sorting, sequence numbers are reassigned in order (starting from 1).
4. **File Write**:
   - Writes the finalized, sorted events to a canonical session file at:
     - `sessions/{sessionId}.jsonl`
   - The output file is a JSONL file, one event per line.

## Outputs

- **Success**: Prints a message with the output file path (e.g., `✔ finalized → sessions/abc123.jsonl`).
- **Failure**: If required context is missing, command exits silently (no output).

## Filename Patterns

- **Input**: Any file path, but typically from `inProgressDir()` (e.g., `in-progress/{sessionId}.jsonl`).
- **Output**: `sessions/{sessionId}.jsonl`

## Failure Conditions

- Missing or invalid session context (`sessionId` or `file` not set): command aborts, no file is written.
- If the in-progress file does not exist or is unreadable, behavior is undefined (not handled in current code).

## Implicit Cursors

- No explicit cursor or pointer is maintained; all events are processed in-memory and output is a full rewrite.

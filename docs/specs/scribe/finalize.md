# `scribe finalize` Command Spec

## Overview

Finalizes an in-progress scribe session event log, splitting it into season-homogeneous parts, normalizing keys, and writing canonical session files with validation and metadata.

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
2. **Validation**:
   - Requires at least one `day_start` event.
   - Allows multiple `day_start` events within a season.
   - Errors on impossible event ordering (e.g., non-monotonic timestamps or sequence numbers).
3. **Event Finalization**:
   - Reads all events from the in-progress file.
   - If no `session_end` event is present, appends a `session_end` event with `payload: { status: 'final' }` and a new sequence number.
4. **Splitting by Season**:
   - Splits events into contiguous, season-homogeneous parts based on `day_start` events' season boundaries.
   - For each part, outputs a separate file: `sessions/{sessionId}/Sxxa.jsonl`, `Sxxb.jsonl`, etc. (where `Sxx` is the normalized season ID, and `a`, `b`, ... are part letters).
   - Inserts a minimal rollover mini-session event `{ kind: "season_rollover", seasonId }` between parts.
5. **Normalization**:
   - **Season IDs**: Derived from `calendarDate + season` (from `day_start`), stored lower-case. Season comparisons are case-insensitive.
   - **Trail edge keys**: Canonicalized by sorting endpoints (column letters, numeric row), stored lower-case as `"{col}{row}-{col}{row}"`.
6. **Cursors and Move Inference**:
   - The `session_start.startHex` is used as the initial `currentHex`.
   - For `move` events with `from=null`, the finalized output does **not** attach an inferred `from`; downstream logic (e.g., `weave`) is expected to infer at apply time.
7. **Sorting**:
   - Events are sorted by:
     1. Timestamp (`ts`), ascending (if present).
     2. Sequence number (`seq`), ascending (if present).
     3. Original file order (as fallback).
   - After sorting, sequence numbers are reassigned in order (starting from 1) within each part.
8. **File Header/Sidecar**:
   - Each output file (or its first record) includes a header/sidecar object: `{ id, seasonId, inWorldStart, inWorldEnd }`.
9. **File Write**:
   - Writes each finalized, sorted, and normalized part to its own file under `sessions/{sessionId}/`.
   - Each output file is a JSONL file, one event per line, with the header/sidecar as the first record.

## Outputs

- **Success**: Prints a message for each output file (e.g., `✔ finalized → sessions/abc123/S23a.jsonl`).
- **Failure**: If required context is missing, or validation fails, prints an error and aborts (no files written).

## Filename Patterns

- **Input**: Any file path, but typically from `inProgressDir()` (e.g., `in-progress/{sessionId}.jsonl`).
- **Output**: `sessions/{sessionId}/Sxxa.jsonl`, `Sxxb.jsonl`, ... (one per season-homogeneous part).

## Failure Conditions

- Missing or invalid session context (`sessionId` or `file` not set): command aborts, no file is written.
- No `day_start` event: command aborts, prints error.
- Impossible event ordering: command aborts, prints error.
- If the in-progress file does not exist or is unreadable, behavior is undefined (not handled in current code).

## Implicit Cursors

- No explicit cursor or pointer is maintained; all events are processed in-memory and output is a full rewrite.
- The initial `currentHex` is taken from `session_start.startHex`.
- `move` events with `from=null` are left as-is for downstream inference.

# `scribe finalize` Command Spec

## Overview

Finalizes an in-progress scribe session event log. Splits it into season-homogeneous parts, inserts standalone rollover logs where boundaries occur, normalizes keys, and writes canonical session files. Commits the reserved session sequence number in `meta.yaml` only if output is produced.

Handles both **session lifecycle events** and **season boundaries** without dropping legitimate non-day events.

## Inputs

- **Context object** (`ctx`) with:
  - `sessionId`: The session identifier (string, required).
  - `file`: Path to the in-progress event log file (string, required).
- **Flags**:
  - `--dev`: Run in dev namespace; no sequence numbers, locks, or meta updates.

## Preconditions

- **Production**: An active lock file must exist for this session under `data/session-logs/.locks/`.
- **Dev**: No lock file required.

## Event Assumptions

* The in-progress file is a JSONL event log containing events such as:
  * `session_start` (status `"in-progress"`)
  * `session_pause` (status `"paused"`)
  * `session_continue` (status `"in-progress"`)
  * `session_end` (status `"final"`)
  * `day_start`, `day_end`
  * action events (`move`, `trail`, etc.)
* The log may or may not contain a `session_end`.

## Behavior

1. **Guards**

  - Abort if `sessionId` or `file` missing from context.
  - Abort if no matching lock in production mode.

2. **Validation**

  * Requires at least one `day_start`.
  * Allows multiple `day_start` events in the same season.
  * Errors on impossible ordering (non-monotonic timestamps or seq).
  * Every file must begin with `session_start` or `session_continue`.
  * `session_pause` may appear only at the end of a file.

3. **Finalize Events**

  * Load all events from the in-progress file.
  * If missing, append a `session_end` with `{ "status": "final" }` and a new sequence number.
  * If file ends without `session_end`, it may end with `session_pause` instead.

4. **Splitting by Season**
  - Partition only **day-bound events** by season.
  - **Session-level events** (start/pause/continue/party edits) are not discarded; they are preserved outside day partitions and included in the finalized file.
  - Partition into contiguous blocks where `day_start.seasonId` is constant.
  - For each block, write a finalized session file:
    ```
    data/session-logs/session_<SEQ><suffix>_<YYYY-MM-DD>.jsonl
    ```
    - `<suffix>` = a, b, c… if multiple blocks.
  - Between blocks, emit a minimal **rollover** file under:
    ```
    data/session-logs/rollovers/rollover_<seasonId>_<YYYY-MM-DD>.jsonl
    ```
    containing only `{ "kind": "season_rollover", "seasonId": "<id>" }`.

5. **Normalization**

  - **Season IDs**: `<year>-<season>` (from `day_start.calendarDate` + `season`), lower-case, case-insensitive compare.
  - **Trail edges**: Canonicalize as `"{col}{row}-{col}{row}"`, lower-case, with sort order = column letters then row numbers.

6. **Cursors & Move Inference**

  * Seed `currentHex` from `session_start.startHex` (or from `session_continue.currentHex`).
  * `session_continue` payload must also carry `currentParty` and `currentDate`.
  * Do **not** rewrite `move.from=null`; leave inference to `weave`.

7. **Sorting**

  - Events sorted by:
    1. Timestamp ascending (if present).
    2. Sequence ascending (if present).
    3. Original file order.
  - Reassign `seq` starting from 1 within each part.

  - `session_start`, `session_pause`, `session_continue`, `session_end` are treated as valid events for ordering.
  - `session_pause` is the last event in a file by construction.


8. **Header / Sidecar**

  - First record in each finalized file is:
    ```json
    { "kind": "header", "id": "<sessionId><suffix>", "seasonId": "<id>", "inWorldStart": "...", "inWorldEnd": "..." }
    ```

9. **File Writes**

  - Writes each finalized file atomically (temp + rename).
  - Rollover files written alongside session files.
  - For production:
    - Session → `data/session-logs/`
    - Rollover → `data/session-logs/rollovers/`
  - For dev (`--dev`):
    - Session → `data/session-logs/_dev/`
    - Rollover → `data/session-logs/_dev/rollovers/`

10. **Sequence Counter & Lock Handling**

  - **Prod**:
    - If ≥1 finalized outputs were written:
      - Read `meta.nextSessionSeq`.
      - If it mismatches the lock’s `seq`, heal by setting `meta.nextSessionSeq = lock.seq + 1`.
      - Otherwise, set `meta.nextSessionSeq = current + 1`.
      - Write `meta.yaml` atomically.
    - If no outputs, do not bump the counter.
    - Remove lock file and in-progress file.
  - **Dev**:
    - No counter updates, no locks. Simply delete the in-progress file after writing outputs.

## Outputs

- **Success**:
  - Prints one line per finalized output:
    - `✔ finalized → data/session-logs/session_0023a_2025-09-15.jsonl`
    - `✔ rollover → data/session-logs/rollovers/rollover_1511-autumn_2025-09-15.jsonl`
- **Failure**:
  - Error messages for missing context, no `day_start`, impossible order, or missing lock.

## Filename Patterns

- **Prod session**: `session_<SEQ>_<YYYY-MM-DD>.jsonl` or with suffix `a`, `b`, …
- **Prod rollover**: `rollover_<seasonId>_<YYYY-MM-DD>.jsonl`
- **Dev session**: `_dev/dev_<ISO>.jsonl`
- **Dev rollover**: `_dev/rollovers/dev_rollover_<seasonId>_<ISO>.jsonl`

## Failure Conditions

- Missing context or lock (prod only).
- No `day_start` event.
- Impossible ordering.
- Filesystem errors (throws).
- File does not begin with `session_start` or `session_continue`.
- File ends with neither `session_end` nor `session_pause`.

## Implicit Cursors

- `currentHex` initialized from `session_start.startHex` or `session_continue.currentHex`.
- No explicit pointers are persisted; all derived at runtime.
- `move.from=null` preserved for later inference by `weave`.

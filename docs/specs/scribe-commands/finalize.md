# `scribe finalize` Command Spec (v1.1)

## Overview

Finalizes an in-progress scribe **session** event log. Splits it into **season-homogeneous parts**, inserts **standalone rollover** logs where boundaries occur, normalizes keys, and writes **canonical session files**. Commits the reserved session sequence number in `meta.yaml` only if output is produced.

Handles both **session lifecycle events** and **season boundaries** without dropping legitimate non-day events. Ensures that `sessionDate` from the `session_start` event matches the filename stem and that finalized sessions respect the global sequence ordering model.

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
  * `session_start` (status `"in-progress"`, includes `"sessionDate"`)
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
  - Abort if the session ID’s `<SEQ>` does not match the lock’s `seq` (unless running in recovery mode).
  - Verify that `session_start.sessionDate` matches the `<YYYY-MM-DD>` in the filename stem.

2. **Validation**

  - Requires at least one `day_start`.
  - Allows multiple `day_start` events in the **same** season.
  - Errors on impossible ordering (non-monotonic timestamps or seq).
  - Every file must begin with `session_start` or `session_continue`.
  - `session_pause` may appear only at the end of a file.

3. **Finalize Events**

  - Load all events from the in-progress file.
  - If missing, append a `session_end` with `{ "status": "final" }` and a new sequence number.
  - If file ends without `session_end`, it may end with `session_pause` instead.

4. **Splitting by Season**

  - Partition **day-bound events** by season (based on `day_start.payload.calendarDate`).
  - **Session-level events** (start/pause/continue/party edits) are preserved outside day partitions and included in each finalized part as appropriate.
  - Partition into contiguous blocks where the normalized season (derived via domain rules) is constant.
  - For each block, write a finalized session file:

    ```
    data/session-logs/session-<SEQ>_<YYYY-MM-DD>.jsonl
    ```

    - Append alphabetical `<suffix>` (`a`, `b`, `c`, …) to the filename if multiple blocks for the same `SEQ`:

      ```
      data/session-logs/session-<SEQ>_<YYYY-MM-DD>a.jsonl
      ```

  - **Between blocks**, emit a minimal **rollover** file under:

    ```
    data/session-logs/rollovers/rollover_<seasonId>.jsonl
    ```

    containing exactly:

    ```json
    { "kind": "season_rollover", "payload": { "seasonId": "<id>" } }
    ```

    - **Idempotency:** If a rollover file for that season already exists, do **not** write a duplicate (leave existing file as-is).

5. **Normalization**

  - **Season IDs**: `YYYY-season` (from `day_start.payload.calendarDate`), lower-case.
  - **Trail edges**: Canonicalize as `"{col}{row}-{col}{row}"`, lower-case, with sort order = column letters then row numbers.
  - **Session filenames**: `session-<SEQ>_<YYYY-MM-DD>[a|b|…].jsonl` (hyphen after `session`, underscore before date).

6. **Cursors & Move Inference**

  - Seed `currentHex` from `session_start.payload.startHex` (or from `session_continue.payload.currentHex`).
  - `session_continue` payload must also carry `currentParty` and `currentDate`.
  - Do **not** rewrite `move.from=null`; leave inference to `weave`.

7. **Sorting**

  - Events sorted by:
    1. Timestamp ascending (if present).
    2. Sequence ascending (if present).
    3. Original file order.
  - Reassign `seq` starting from 1 within each finalized part.
  - `session_start`, `session_pause`, `session_continue`, `session_end` are valid events for ordering.
  - `session_pause` is the last event in a file by construction.

8. **Header / Sidecar**

  - First record in each finalized file is a header record:

    ```json
    { "kind": "header", "payload": { "id": "<sessionId><suffix>", "seasonId": "<id>", "inWorldStart": "...", "inWorldEnd": "..." } }
    ```

9. **File Writes**

  - Writes each finalized file atomically (temp + rename).
  - **Prod**:
    - Session → `data/session-logs/`
    - Rollover → `data/session-logs/rollovers/`
  - **Dev (`--dev`)**:
    - Session → `data/session-logs/_dev/`
    - Rollover → `data/session-logs/_dev/rollovers/`
  - **Idempotency:** Session outputs for an existing `SEQ`/suffix should overwrite or error consistently (implementation choice); rollover outputs are **non-duplicating** (see above).

10. **Sequence Counter & Lock Handling**

  - **Prod**:
    - If ≥1 finalized outputs were written:
      - Read `meta.nextSessionSeq`.
      - If finalizing a session with `seq` **lower** than `meta.nextSessionSeq`, print warning and set `meta.nextSessionSeq = max(existing finalized seq) + 1`.
      - If `meta.nextSessionSeq` mismatches the lock’s `seq`, heal by setting it to `lock.seq + 1`.
      - Write `meta.yaml` atomically.
    - If no outputs, do not bump the counter.
    - Remove lock file and in-progress file.
  - **Dev**:
    - No counter updates, no locks. Delete in-progress file after writing outputs.

  > **Implementation Note:** To compute `max(finalized)`, the command should
  > inspect all finalized session files in `data/session-logs/` and extract
  > their `<SEQ>` values from filenames. The resulting value determines the
  > new `meta.nextSessionSeq = max(finalized) + 1`. This ensures correct
  > sequencing even when sessions are finalized out of order.

## Outputs

- **Success**:
  - Prints one line per finalized output:
    - `✔ finalized → data/session-logs/session-0023_2025-09-15.jsonl`
    - `✔ rollover → data/session-logs/rollovers/rollover_1511-autumn.jsonl`
- **Failure**:
  - Error messages for missing context, no `day_start`, impossible order, missing lock, or date mismatch.

## Filename Patterns (canonical)

- **Prod session**: `session-<SEQ>_<YYYY-MM-DD>.jsonl` (or with suffix `a`, `b`, …)
- **Prod rollover**: `rollover_<seasonId>.jsonl`
- **Dev session**: `data/session-logs/_dev/session/dev_<ISO>.jsonl` (exact dev naming is flexible)
- **Dev rollover**: `data/session-logs/_dev/rollovers/dev_rollover_<seasonId>_<ISO>.jsonl`

## Failure Conditions

- Missing context or required lock (prod only).
- No `day_start` event.
- Impossible ordering.
- Filesystem errors (throws).
- File does not begin with `session_start` or `session_continue`.
- File ends with neither `session_end` nor `session_pause`.
- `sessionDate` mismatch with filename stem.

## Implicit Cursors

- `currentHex` initialized from `session_start.startHex` or `session_continue.currentHex`.
- No explicit pointers are persisted; all derived at runtime.
- `move.from=null` preserved for later inference by `weave`.

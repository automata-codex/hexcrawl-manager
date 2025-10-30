# `scribe abort` Command Spec

## Overview

Cancels an in-progress scribe session without finalizing it. Deletes the in-progress file and lock, leaving no finalized session logs behind. Does not increment the session sequence counter in `meta.yaml`.

## Inputs

- **Context object** (`ctx`) with:
  - `sessionId`: The session identifier (string, required).
  - `file`: Path to the in-progress event log file (string, required).
- **Flags**:
  - `--dev`: Run in dev namespace; skips lock handling and sequence counters.

## Preconditions

- **Production**: A lock file must exist for the session in `data/session-logs/.locks/`.
- **Dev**: An in-progress dev file must exist under `data/session-logs/_dev/`.

## Behavior

1. **Guards**
  - Abort if `sessionId` or `file` missing from context.
  - In production, abort if no matching lock file is found.

2. **File Deletion**
  - Delete the in-progress JSONL file for the session.
  - **Prod**: also delete the matching lock file from `.locks/`.
  - **Dev**: only delete the in-progress file.

3. **Meta Handling**
  - Do not increment or decrement `meta.nextSessionSeq`.
  - The reserved sequence number is considered burned (to prevent duplicate filenames).

4. **Cleanup**
  - Ensure no partial files remain after abort.
  - If deletion fails (e.g., file missing), print warning and continue cleanup.

## Outputs

- **Success**:
  - Prints `✘ aborted: {sessionId}`
- **Failure**:
  - Prints error if required context is missing or no matching lock (prod).

## Filename Patterns

- **Prod in-progress**:
  `data/session-logs/in-progress/session-<SEQ>_<YYYY-MM-DD>.jsonl`
- **Prod lock**:
  `data/session-logs/.locks/session-<SEQ>.lock`
- **Dev in-progress**:
  `data/session-logs/_dev/dev_<ISO>.jsonl`

## Failure Conditions

- Missing or invalid context.
- No lock file found in prod mode.
- Filesystem deletion errors (propagate as error or print warning).

## Related Commands

- **`scribe start`**: Creates in-progress file and reserves sequence number.
- **`scribe finalize`**: Converts in-progress file into finalized logs and bumps the sequence counter.
- **`scribe doctor`**: Reports stale locks and can identify aborted sessions that weren’t cleaned up.

# `scribe doctor` Command Spec (v1.1)

## Overview

Inspects session-related metadata, in-progress files, and locks to identify potential issues. Reports on sequence continuity, date consistency, and file/lock mismatches. Provides diagnostics only; does not modify state. Designed to work safely alongside `start interactive` backfills.

## Inputs

- **Flags**:
  - `--dev`: Inspect only the dev namespace (`data/session-logs/_dev/`).
  - No flags: Inspect production namespace by default.

## Preconditions

- `data/meta.yaml` should exist (prod only).
- Relevant directories exist:
  - `data/session-logs/`
  - `data/session-logs/.locks/`
  - `data/session-logs/in-progress/`
  - `data/session-logs/_dev/` (for dev)

## Behavior

1. **Load Metadata**
  - **Prod**: Read `meta.nextSessionSeq` and report it as “next available sequence number.”
  - **Dev**: No meta handling.

2. **Check Locks**
  - List all lock files under `.locks/`.
  - For each lock:
    - Verify corresponding in-progress file exists.
    - If lock is older than a configurable threshold (e.g., >24h) → mark as stale.
    - Report missing or mismatched files.

3. **Check In-Progress Files**
  - List files under `in-progress/` (prod) or `_dev/` (dev).
  - Verify each file has a matching `session_start` event.
  - Report orphaned in-progress files (no lock in prod).
  - If orphaned, print **manual remediation instructions** for recreating a lock:
    ```bash
    echo '{"seq": <SEQ>, "filename": "session_<SEQ>_<DATE>.jsonl", "createdAt": "'$(date -Iseconds)'", "pid": <PID>}' > data/session-logs/.locks/session_<SEQ>.lock
    ```

4. **Check Sequence Gaps**
  - Collect all known `<SEQ>` from finalized, in-progress, and lock files.
  - Sort numerically and identify gaps.
  - Gaps caused by `start interactive` are marked as **intentional** (if those sessions exist).
  - Warn about missing intermediate numbers and suggest verifying against `meta.nextSessionSeq`.

5. **Check Session Date Consistency**
  - For each `session_start`, confirm `sessionDate` matches the `<DATE>` portion of the filename stem.
  - Report any mismatches.

6. **Check Session Logs**
  - Optionally scan finalized session files.
  - Report sessions that span multiple seasons without splits (should not happen if `finalize` worked correctly).

7. **Check Dev Files**
  - If not in `--dev` mode, also list `_dev/` files for visibility.
  - Report that dev files never affect `nextSessionSeq`.

8. **Summarize Findings**
  - Print structured report including:
    - Next session sequence (prod).
    - Count of active locks, stale locks, orphaned files.
    - Sequence gaps and intentional backfills.
    - Date mismatches.
    - Any cross-season sessions.
    - Number of dev files found.

## Outputs

- **Normal run**: Prints human-readable diagnostics, e.g.:
  ```
  next session seq: 43
  active locks: 1
  orphaned in-progress files: 0
  stale locks: 0
  gaps: 1 (intentional backfill: session_0012_2023-07-31)
  date mismatches: 0
  ```

- **Warnings**:
  - Print manual remediation guidance when locks or files are missing or mismatched.
  - Never auto-modify filesystem state.

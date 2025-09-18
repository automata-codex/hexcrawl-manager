# `scribe doctor` Command Spec

## Overview

Inspects session-related metadata, in-progress files, and locks to identify potential issues. Reports on the next session sequence number, stale or inconsistent locks, sessions that cross season boundaries, and presence of dev files. Provides diagnostics only; does not modify state.

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

4. **Check Session Logs**
  - Optionally scan finalized session files.
  - Report sessions that span multiple seasons without splits (should not happen if `finalize` worked correctly).

5. **Check Dev Files**
  - If not in `--dev` mode, also list `_dev/` files for visibility.
  - Report that dev files never affect `nextSessionSeq`.

6. **Summarize Findings**
  - Print structured report including:
    - Next session sequence (prod).
    - Count of active locks, stale locks, and orphaned files.
    - Any cross-season sessions.
    - Number of dev files found.

## Outputs

- **Normal run**: Prints human-readable diagnostics, e.g.:

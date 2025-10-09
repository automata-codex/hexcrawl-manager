# `scribe start` Command Spec

## Overview

Initializes or resumes a scribe session event log. Creates an in-progress file if needed and records the session start event. Enforces production and development filename conventions, reserves session sequence numbers with lock files, and prevents duplicate active sessions. Session IDs always match the enforced filename stem.

## Inputs

- **Arguments** (array of strings):
  - `args[0]`: Hex ID (e.g., `P13`), required for new sessions.
- **Context object** (`ctx`):
  - Used to store `sessionId` and `file` (in-progress file path).
- **Dev mode**:
  - Enabled if `--dev` flag is passed or environment variable `SKYREACH_DEV="true"`.

## Behavior

1. **Argument Parsing**
  - If no args → print usage and exit.
  - If one arg → treat as hex ID; validate.
  - Invalid hex → print error and exit.

2. **Session ID and Filename Generation**
  - **Production**:
    - Format: `session_<SEQ>_<YYYY-MM-DD>` (zero-padded integer, e.g., `session_0012_2025-09-15`).
    - The `<SEQ>` is taken from `meta.nextSessionSeq` but **not incremented here**.
  - **Dev mode**:
    - Format: `dev_<ISO>` (ISO timestamp).
  - Session ID always equals the filename stem.

3. **Filename Enforcement**
  - **Production**:
    - In-progress file path: `data/session-logs/in-progress/session_<SEQ>_<YYYY-MM-DD>.jsonl`.
    - Lock path: `data/session-logs/.locks/session_<SEQ>.lock`.
  - **Dev mode**:
    - In-progress file path: `data/session-logs/_dev/dev_<ISO>.jsonl`.
    - No lock file; no sequence reservation.

4. **Session Sequence Management (Production only)**
  - Reads `meta.nextSessionSeq` (1-based).
  - Uses that value as `<SEQ>` for this session.
  - Creates a lock file containing JSON metadata:
    ```json
    {
      "seq": <SEQ>,
      "filename": "session_<SEQ>_<YYYY-MM-DD>.jsonl",
      "createdAt": "<ISO>",
      "pid": <process id>
    }
    ```
  - **Does not increment** `nextSessionSeq` yet. That happens only when `finalize` succeeds.
  - If lock exists for the same `<SEQ>`, abort with error (active session already in progress).

5. **Session File Handling**
  - Sets `ctx.sessionId` and `ctx.file`.
  - If the in-progress file does not exist:
    - Append a `session_start` event:
      ```json
      { "kind": "session_start", "status": "in-progress", "id": "<sessionId>", "startHex": "<hex>" }
      ```
    - Print `started: {sessionId} @ {hex}`.
  - If in-progress file already exists:
    - Read all events.
    - Determine last known hex (from events, else fallback to provided arg).
    - Print `resumed: {sessionId} ({eventCount} events) — last hex {hex}`.

## Outputs

- **New session**:
  `started: {sessionId} @ {startHex}`
- **Resume**:
  `resumed: {sessionId} ({eventCount} events) — last hex {hex}`
- **Error**: Invalid args or hex, missing meta, or lock conflict.

## Event Assumptions

- In-progress file is JSONL of events.
- First event in a new session is always `session_start`.
- No other events written by this command.

## File Writes

- **Prod**:
  - In-progress file → `data/session-logs/in-progress/session_<SEQ>_<YYYY-MM-DD>.jsonl`
  - Lock file → `data/session-logs/.locks/session_<SEQ>.lock`
- **Dev**:
  - In-progress file → `data/session-logs/_dev/dev_<ISO>.jsonl`
- **Event written**: one `session_start` for new sessions.

## Filename Patterns

- **Production**: `session_<SEQ>_<YYYY-MM-DD>.jsonl` (zero-padded, e.g. `session_0007_2025-09-15.jsonl`)
- **Dev**: `dev_<ISO>.jsonl` under `_dev/`
- **Lock**: `.locks/session_<SEQ>.lock`

## Failure Conditions

- No arguments → usage and exit.
- Invalid hex → error and exit.
- Lock conflict (session already active) → error and exit.
- Filesystem write failure → throw/exit.

## Implicit Cursors

- None maintained here. For resume message, last hex is inferred from the existing events.

## Related Commands

- **`scribe finalize`**: closes the session, bumps `nextSessionSeq`.
- **`scribe abort`**: discards in-progress file + lock, does not bump counter.
- **`scribe doctor`**: inspects session locks, next sequence, dev files, and anomalies.

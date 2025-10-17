# `scribe start` Command Spec (v1.2)

Two entry paths are supported:

- **`start <HEX>`** — Normal start (safe defaults).
- **`start interactive`** — Power-user flow with explicit overrides, prompts, and preview.

## `start <HEX>` — Normal start

### Overview

Initializes or resumes a scribe session event log with safe defaults. Creates an in-progress file if needed and records the session start event. Enforces production and development filename conventions, reserves session sequence numbers with lock files, and prevents duplicate active sessions. Session IDs always match the enforced filename stem.

### Inputs

- **Arguments** (array of strings):
  - `args[0]`: Hex ID (e.g., `P13`), required for new sessions.
- **Context object** (`ctx`):
  - Stores `sessionId` and `file` (in-progress file path).
- **Dev mode**:
  - Enabled if `--dev` flag is passed at REPL launch or `SKYREACH_DEV="true"` in the environment.

### Behavior

1. **Argument Parsing**
  - If no args → print usage and exit.
  - If one arg → treat as hex ID; validate.
  - Invalid hex → print error and exit.

2. **Session ID and Filename Generation**
  - **Production**:
    - Format: `session-XXXX_YYYY-MM-DD` (XXXX is a four-digit, zero-padded integer, e.g., `session-0012_2025-09-15`).
    - `XXXX` taken from `meta.nextSessionSeq` (1-based), **not incremented here**.
    - `YYYY-MM-DD` is **the date the session took place (local)**.
  - **Dev mode**:
    - Format: `dev_<ISO>` (ISO timestamp).
  - Session ID always equals the filename stem (e.g., `session-0012`).

3. **Filename Enforcement**
  - **Production**:
    - In-progress file: `data/session-logs/in-progress/session-XXXX_YYYY-MM-DD.jsonl`.
    - Lock: `data/session-logs/.locks/session-XXXX.lock`.
  - **Dev mode**:
    - In-progress file: `data/session-logs/_dev/dev_<ISO>.jsonl`.
    - No lock file; no sequence reservation.

4. **Session Sequence Management (Production only)**
  - Read `meta.nextSessionSeq`.
  - Use that value as `XXXX`.
  - Create a lock file containing JSON metadata:

    ```json
    {
      "seq": XXXX,
      "filename": "session-XXXX_YYYY-MM-DD.jsonl",
      "createdAt": "<ISO>",
      "pid": <process id>
    }
    ```
  - **Do not increment** `nextSessionSeq` yet. Increment happens on successful `finalize`.
  - If lock exists for `XXXX`, abort (active session in progress).

5. **Session File Handling**
  - Set `ctx.sessionId` and `ctx.file`.
  - If the in-progress file does not exist:
    - Append a `session_start` event:
      ```json
      {
        "kind": "session_start",
        "status": "in-progress",
        "id": "session-XXXX",
        "startHex": "<hex>",
        "sessionDate": "YYYY-MM-DD"
      }
      ```
    - Print `started: {sessionId} @ {hex}`.
  - If in-progress file already exists:
    - Read events; determine last known hex (fallback to arg).
    - Print `resumed: {sessionId} ({eventCount} events) — last hex {hex}`.

## `start interactive` — Power-user overrides

### Overview

Guided, prompt-based flow to create a new **production** session with explicit control over **sequence number** and **session date**. Designed for historical backfill and corrections. **Not available in dev mode**.

### Flow

1. **Prompt — Start Hex**
   - Ask for start hex (validate). Default: none (must be provided).

2. **Derive Defaults**
   - Default `seq = meta.nextSessionSeq`.
   - Default `date = today (YYYY-MM-DD)`.

3. **Prompt — Overrides**
   - Show preview of computed stem: `session-XXXX_YYYY-MM-DD` and file paths.
   - Ask: “Override sequence number?” → if yes, prompt integer ≥ 1.
   - Ask: “Override session date?” → if yes, prompt `YYYY-MM-DD` (validate real date).

4. **Conflict Checks**
   - If a lock exists for `XXXX` → show error and **abort** (offer to run `doctor`).
   - If a file exists for the stem **but no lock** → warn and show **manual remediation instructions** (see below). Allow user to **cancel** or **continue** (continue will write only if they also choose to recreate the lock manually first).

5. **Confirmation**
   - Show final stem + paths:
     - `…/in-progress/session-XXXX_YYYY-MM-DD.jsonl`
     - `…/.locks/session-XXXX.lock`
   - Confirm: “Create session and lock?” `[y/N]`

6. **Write**
   - Create lock (production-only).
   - Create new file (or append if resuming), and append `session_start` if new:
     ```json
     { "kind": "session_start", "status": "in-progress", "id": "session-XXXX", "startHex": "<HEX>", "sessionDate": "YYYY-MM-DD" }
     ```
   - Print success summary.

### Manual remediation instructions (when needed)

When a file exists without a lock, print:

```
Orphaned session file detected:
  <path/to/in-progress/session-XXXX_YYYY-MM-DD.jsonl>
No matching lock at:
  <path/to/.locks/session-XXXX.lock>

To recreate lock manually:
  echo '{"seq": XXXX, "filename": "session-XXXX_YYYY-MM-DD.jsonl", "createdAt": "'$(date -Iseconds)'", "pid": <PID>}' > <lock-path>
Then rerun `start interactive`.
```

### Rules & Limits

- **Production only**. If REPL was launched in `--dev` or `SKYREACH_DEV="true"`, print: “`start interactive` is unavailable in dev mode.”
- Gaps in session numbering are **allowed** but a warning is shown. Gaps will be reported by `doctor`, and ordering is enforced by `finalize`/`weave apply`.
- `sessionDate` in `session_start` **must match** the `YYYY-MM-DD` portion of the stem; the command enforces this.

## Outputs (both forms)

- **New session**:
  `started: {sessionId} @ {startHex}`
- **Resume**:
  `resumed: {sessionId} ({eventCount} events) — last hex {hex}`
- **Error**: Invalid args or hex, missing meta, lock conflict, dev-mode restriction, or validation failure.

## Event Assumptions

- In-progress file is JSONL of events.
- First event in a new session is always `session_start`.
- `session_start` must include a `sessionDate` field matching the date in the filename.
- No other events written by `start` commands.

## File Writes

- **Prod**:
  - In-progress file → `data/session-logs/in-progress/session-XXXX_YYYY-MM-DD.jsonl`
  - Lock file → `data/session-logs/.locks/session-XXXX.lock`
- **Dev**:
  - In-progress file → `data/session-logs/_dev/dev_<ISO>.jsonl` (no `start interactive` here)

## Failure Conditions

- No arguments to `start <HEX>` → usage and exit.
- Invalid hex → error and exit.
- Lock conflict (session already active) → error and exit.
- Filesystem write failure → throw/exit.
- `start interactive` invoked in dev mode → error and exit.

## Help text (REPL excerpt)

```
start <HEX>              Begin a new session with defaults (next sequence, today’s date).
start interactive        Guided flow to set sequence/date (production only). Use for backfills.
```

## Related Commands

- **`finalize`**: closes the session, bumps `nextSessionSeq`, enforces order.
- **`abort`**: discards in-progress file + lock, does not bump counter.
- **`doctor`**: inspects session locks, next sequence, dev files, gaps, and anomalies. Prints manual remediation steps for orphaned locks/files.

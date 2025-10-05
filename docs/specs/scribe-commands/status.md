# `scribe status` Command Spec (v1.0)

## Overview

Displays the **current session** and **party/day** status for the active in‑progress file. Includes session identity (stem/seq/date), production vs dev mode, lock presence (prod), hex location & lost state, calendar date, daylight and active hours used, and exhaustion warnings. If no open day is active, prints a short prompt to start one.

This command is **read‑only**. It never writes events or touches locks/meta.

## Inputs

- **Arguments**: None (array of strings, ignored).
- **Context object** (`ctx`):
  - `file` (required): absolute path to the **in‑progress** session file.
  - `calendar` (required): for date/season formatting and segment→hour conversion.
  - `sessionId` (optional): if present, used for display; otherwise derived from the file stem.
  - `dev` (optional boolean): whether the REPL is in dev mode (can also be inferred from `ctx.file` path).
  - `locksDir` (optional): production locks directory (default `data/session-logs/.locks/`).

## Preconditions

- The in‑progress file exists and is readable.
- The file begins with `session_start` **or** `session_continue` (validated; status prints a warning if not).

## Behavior

1. **Load & Derive Session Identity**
  - Read all events from `ctx.file` (JSONL).
  - Determine `stem` by stripping extension from the filename.
  - **Parse stem** with `parseSessionStem`:
    - **Prod**: `session_<SEQ>_<YYYY-MM-DD>[<suffix>]`
    - **Dev**:   `dev_<ISO>`
  - Extract or derive:
    - `sessionId = events[0].id` (fallback to `stem`).
    - `seq` (number, prod only) and `sessionDate`:
      - `sessionDate` is taken from the first `session_start.sessionDate` if present; otherwise from the stem date (prod).

2. **Consistency Checks (non‑fatal warnings)**
  - If prod and a `session_start` is present but its `sessionDate` **≠** the stem `<YYYY-MM-DD>`, print a **date mismatch warning**.
  - If the file does **not** begin with `session_start` or `session_continue`, print a **header warning**.
  - If prod and `locksDir/session_<SEQ>.lock` is **missing**, print a **missing lock warning** (orphaned file).

3. **Compute Party/Day Cursors**
  - `currentHex` := `selectCurrentHex(events)`:
    - Seed from `session_start.startHex` or `session_continue.currentHex`; update via `move`.
  - `lost` := `isPartyLost(events)`.
  - `openDay` := `findOpenDay(events)`:
    - If **none**: print hex + prompt (see Output: No open day) and **return**.
  - From most recent `day_start`:
    - `calendarDate`
    - `daylightCapSegments` (convert to hours below).

4. **Segments & Hours**
  - Compute usage since the last `day_start`:
    - `usedDaylightSegments`
    - `usedActiveSegments`
  - Convert using `segmentsToHours` in `calendar`:
    - `usedDaylightH`, `daylightCapH`, `usedActiveH`.
  - Thresholds:
    - If `usedActiveH > 12h` → **exhaustion threshold exceeded** (warning).
    - If `usedActiveH == 12h` → **at threshold** (warning).
    - If `usedActiveH >= 10h` → **approaching threshold** (info).

5. **Output (Normal)** — see formatting below.

## Output Formatting

### Normal (open day exists)

```
🧾 Session: {sessionId}  (seq {SEQ}|dev)  {stem}
📅 Session Date: {sessionDate}
🔒 Lock: {OK|MISSING} {lockPath_if_prod}
📄 Events: {count}  •  Mode: {production|dev}

📍 Hex: {hex}
🧭 Lost: {ON|OFF}
📅 Day:  {calendarDate}
☀️ Daylight: {usedDaylightH}h / {daylightCapH}h
💪 Active:   {usedActiveH}h / 12h
{thresholdLine_if_any}
```

`thresholdLine_if_any`:
- `⚠️ Exceeded 12h exhaustion threshold` (if `usedActiveH > 12`)
- `⚠️ At 12h exhaustion threshold` (if `== 12`)
- `ℹ️ Approaching 12h threshold` (if `>= 10`)

If header/date/lock warnings exist, show them **above** the block with a prefixed symbol:
- `⚠️ date mismatch: session_start.sessionDate {A} ≠ stem date {B}`
- `⚠️ missing lock for seq {SEQ}: {lockPath}`
- `⚠️ header anomaly: file does not begin with session_start/continue`

### No open day

```
🧾 Session: {sessionId}  (seq {SEQ}|dev)  {stem}
📍 Hex: {hex}
❌ No open day. Start one with: day start [date]
```

## Outputs

- **Normal**: Full status block as above.
- **No open day**: Minimal prompt with hex and `day start` hint.
- **Error**: If session file missing/unreadable, aborts with a short error to stderr (or handled by `requireFile`).

## Failure Conditions

- Missing `ctx.file` or unreadable file.
- Headerless file (no `session_start`/`session_continue`) — reports warning but still attempts to infer cursors.
- All other parsing/IO errors surface as status errors (non‑fatal to REPL loop).

## Dev vs Production Notes

- **Production**
  - Stem: `session_<SEQ>_<YYYY-MM-DD>[suffix]`
  - Lock expected at: `data/session-logs/.locks/session_<SEQ>.lock`
  - `sessionDate` must match stem date; mismatch reported.
- **Dev**
  - Stem: `dev_<ISO>` under `_dev/`
  - No locks, no sequence numbers. Date displayed from `session_start.sessionDate` if present; otherwise derived from ISO in stem.

## Help Text (REPL excerpt)

```
status                   Show current session & party status: seq/date/lock (prod), hex, lost, date, daylight & active hours.
```

## Implementation Hints

- Use the existing helpers: `selectCurrentHex`, `isPartyLost`, `findOpenDay`, `segmentsToHours`, `parseSessionStem`.
- Count events quickly with file line count when feasible (avoid parsing all lines purely to count).
- When printing paths, prefer relative repo paths for readability.
- Keep all warnings **non-fatal**; `status` should be safe to run anytime.

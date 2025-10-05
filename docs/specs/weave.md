# `weave` — Spec (v1.3)

## Purpose

`weave` is the campaign **state applier**. It consumes finalized artifacts (session JSONL logs and standalone season rollovers) and updates canonical data with **strict ordering, idempotency, and auditable footprints**. Domain‑specific apply logic lives in subcommand specs (e.g., **trails** and **ap**).

## CLI Model

* `weave` is a **pure CLI suite** (not a REPL).
* Subcommands are organized by domain:
  - `weave trails plan|apply|status|doctor [<file>]`
  - `weave ap apply [<sessionId>]`
* Optional top‑level convenience wrappers MAY exist (`weave plan|apply`) that delegate to a default domain; this doc treats domain subcommands as canonical.
* If `<file>` is omitted for `trails plan|apply`, the tool:
  - Scans for **unapplied** artifacts (not present in `meta.appliedSessions`).
  - Sorts by **session stem order** (see Ordering).
  - Prompts via Enquirer to select a candidate (CI: require `--no-prompt`).

## Artifacts & File Types

* **Session files** (finalized by `scribe finalize`):
  - `data/session-logs/sessions/session_<SEQ>_<YYYY-MM-DD>.jsonl`
  - Multi‑part when split by season: `session_<SEQ>a_….jsonl`, `session_<SEQ>b_….jsonl`, etc. (Suffix is for display only; **ordering is by `<SEQ>`**.)
  - Must begin with `session_start` (or `session_continue`) and include `session_start.sessionDate` matching stem date.
* **Rollover files** (standalone season maintenance):
  - `data/session-logs/rollovers/rollover_<seasonId>_<YYYY-MM-DD>.jsonl`

> Dev variants (under `_dev/`) are ignored by production applies and never affect `meta`.

## Shared State & Index Files

* `data/meta.yaml`
  - `appliedSessions: string[]` — stems of applied artifacts (sessions & rollovers).
  - `rolledSeasons: string[]` — seasonIds that have been rolled.
  - `nextSessionSeq: number` — next sequence **suggestion** for `scribe`; authoritative ordering comes from stems of finalized files.
* Domain data live under their own files (see the domain specs, e.g., `trails.yaml`, ledgers, etc.).
* Footprints for applies live under domain subfolders, e.g.:
  - `data/session-logs/footprints/trails/…`
  - `data/session-logs/footprints/ap/…`

## Ordering & Chronology (Global Rules)

* **Authoritative order** = numeric `<SEQ>` parsed from the stem `session_<SEQ>_<DATE>`.
* **sessionDate** for reporting/UI comes from the `session_start.sessionDate` field; per‑event timestamps are **provenance only**.
* **Gaps** in `<SEQ>` are allowed (warn); **duplicates** are a hard error.
* A **session** may only be applied if its **seasonId** is **≥** the last rolled season and all missing rollovers up to that season have been applied (domain enforces).
* A **rollover** may only be applied for the **next unrolled season** in chronological order (domain enforces).

## Idempotency (Global Rules)

* If an artifact stem is found in `meta.appliedSessions`, treat as **no‑op** and exit with a distinct code (`3` recommended).
* Re‑applying the same artifact must not change domain state.

## Commands (Overview)

### `weave allocate ap`

* Allocates AP from missed sessions for characters who were absent.

### `weave apply [domain] [options]`

* Updates game state based on a finalized log file.
* If `domain` is omitted, defaults to all domains (currently "AP" and "trails").
* For the `trails` domain:
  * Refuses if Git working tree is dirty (unless `--allow-dirty`).
  * If `<file>` omitted:
    - Prompts user with Enquirer to select a candidate.
  * Enforces chronology and already-applied guard.
  * Runs algorithm, writes state + footprint, updates `meta`.
  * **Exit codes:** `0` (applied ≥1 change), `5` (no-op), `3` (already applied), `2` (repo dirty), `4` (validation error), `6` (I/O error).

### `weave status [domain]`

* Prints Git cleanliness, last N `appliedSessions`, last rolled season, and the **next unapplied** item(s) in chronological order.
* If `domain` omitted, shows global status; otherwise, domain‑specific status (e.g., `weave status ap` or `weave status trails`).

### `weave plan <file>`

* Plans an update from finalized session for trail data (like a "dry run")
* Validates chronology & prerequisites (missing ROLL → fail).
* If `<file>` omitted:
  - Prompts user with Enquirer to select a candidate.
* **Session plan:** list edges to create, edges flipping `usedThisSeason`, and rediscovered edges.
* **Rollover plan:** show counts of maintained / persisted / deleted edges.
* **Exit codes:** `0` (would change state), `5` (no-op), `3` (already applied), `4` (validation error).

### `weave doctor`

* Reports:
  * Pending **required rollovers** before the next session.
  * Out-of-order or multi-season files (should have been split by `scribe finalize`).
  * Trail counts: permanent / non-permanent / currently `usedThisSeason:true`.

## Error Conditions (Global Examples)

* Duplicate `<SEQ>` among finalized session stems.
* `session_start.sessionDate` does not match the stem’s `<YYYY-MM-DD>`.
* Multi‑season session file (should not happen; `scribe finalize` must split).
* Artifact already applied (idempotent no‑op).

## Implementation Notes

* Helper: `parseSessionStem(name) -> { seq: number, date: string, suffix?: string }`.
* Helper: `listUnappliedArtifacts(domain)` returning ordered candidates.
* Use atomic writes for all domain data and footprints.
* CI‑friendliness: `--no-prompt` turns interactive selections into errors when `<file>` is omitted.

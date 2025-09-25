# `weave ap apply` — Command Spec

> **File:** `docs/specs/weave-commands/ap-apply.md`
>
> **Scope:** Convert finalized scribe logs for a session into an immutable **completed** session report and append AP entries to the canonical ledger.
>
> **Related:** AP Workflow Overview (`docs/specs/ap-workflow-overview.md`), central Zod/TS schemas.

---

## 1) Purpose

- Discover finalized scribe log part(s) for a session.
- Derive **attendance** and **per-pillar AP deltas** (with optional `note`) from logs.
- Record **guest players** (if present in logs) in `attendance.guests[]` (informational only).
- Apply **event-level gating** vs **tier derived from level**: sessions ≤0019 grandfather; ≥0020 cap (exclude). Missing `event.maxTier` ⇒ 1; missing character level ⇒ Tier 1.
- Write a **completed** session report (immutable) and **append** per-character `session_ap` entries to the ledger.
- Be **idempotent**: repeat runs with the same `{ sessionId, sorted scribeIds }` make no changes.

Non-goals: absence credit derivation (`status`), absence spends (`allocate`), migration reconciliation (one-time script).

---

## 2) Invocation

```bash
# Auto-mode (Option R): pick the first pending session that has finalized logs
weave ap apply

# Explicit mode: operate on a specific session
weave ap apply <sessionId>     # sessionId format: session-#### (4-digit zero pad)
```

---

## 3) Inputs & Discovery

### 3.1 Inputs
- **Scribe logs (finalized):**
  ```
  data/session-logs/sessions/
    session_####_YYYY-MM-DD.jsonl
    session_####a_YYYY-MM-DD.jsonl
    session_####b_YYYY-MM-DD.jsonl
    ...
  ```
  Multi-part files are allowed; suffix is a single letter `a`..`z` (optional).
- **Session reports:** `data/session-reports/session-####.yaml` (may be absent or planned).
- **Character files:** to read **level** (derive tier: 1–4→T1, 5–10→T2, 11–16→T3, 17–20→T4; missing ⇒ T1).
- **Ledger:** append-only AP history.

### 3.2 Auto-mode session resolution (Option R)
When `<sessionId>` is **omitted**:
1) Find the highest **completed** session number `N_completed` (0 if none).
2) Scan `data/session-logs/sessions/` for any finalized logs matching `session_M*` where `M > N_completed`.
3) If none exist → **fail** (“no finalized logs for any pending session after session-####”).
   If some exist → choose the **smallest** such `M` and set `sessionId := session-MMMM`.

> Explicit mode (`weave ap apply session-####`) bypasses this scan and uses the provided `sessionId`.

### 3.3 Scribe ID discovery (for the chosen session)
- Glob and union:
  - `session_####_*.jsonl`
  - `session_####[a-z]_*.jsonl`
- If **no files found** → **fail** (“no finalized logs for <sessionId>”).
- Sort basenames:
  1) Asc by real-world timestamp in the filename (YYYY-MM-DD).
  2) Tie-break by suffix: (no suffix) < `a` < `b` < …

Result:
- `scribeIds[]` = **all** discovered basenames (sorted).
- **Fingerprint** = `{ sessionId, sorted scribeIds }`.

---

## 4) Preconditions & Hard Failures

- **Finalized logs required:** if none discovered for the target session → **fail**.
- **Completed report conflict:** if a completed report already exists for `sessionId` with a **different** fingerprint → **fail** with guidance (revert previous apply or create a new session).
- **Planned report + dirty git:** if a **planned** report exists for `sessionId`, the git working tree must be **clean**.
  - Dirty check: `git status --porcelain` at repo root; any output = **dirty**.
  - If dirty → **fail** with guidance to commit/stash before creating the immutable completed report.
- **Schema/parse failures** → **fail** with actionable error.

---

## 5) Processing Algorithm

1) **Resolve session** (auto-mode Option R or explicit).
2) **Discover `scribeIds[]`** for that session (3.3).
3) **Parse all parts** in sorted order.
4) **Derive session fields:**
   - `sessionDate` := **earliest** real-world timestamp across parts.
   - `gameStartDate` / `gameEndDate` := from in-world log events (if present).
5) **Derive attendance:** collect `characterId`s from participation/attendance events in logs.
   - If logs include non-character participants, persist `attendance.guests[] = [{ name, note? }]`.
   - Attendance is **strictly log-derived**; no roster lookups.
6) **Aggregate raw AP events per pillar:**
   - If a pillar has AP events, set `delta = 1`; otherwise `delta = 0`.
   - Each AP event carries `{ number, maxTier }`; if `maxTier` is missing, **treat as 1**.
   - (Optional/future) If a log AP event includes a short label/justification, propagate it to `note`.
7) **Apply tier gating per character (tier derived from level):**
   - Derive the character’s **tier T** from **level**: 1–4→T1, 5–10→T2, 11–16→T3, 17–20→T4. If level missing, use **T1**.
   - For each pillar, partition its events by whether **T ≤ event.maxTier**:
     - **Eligible events** (T ≤ maxTier): contribute their `number` to the pillar sum.
     - **Over-tier events** (T > maxTier):
       - **Sessions ≤ 0019:** include them in the sum and mark pillar `reason = "grandfathered"`.
       - **Sessions ≥ 0020:** **exclude** them from the sum.
   - **Reason selection:**
     - ≤0019: if any over-tier event contributed ⇒ `"grandfathered"`, else `"normal"`.
     - ≥0020: if any over-tier event was excluded ⇒ `"cap"`, else `"normal"`.
8) **Idempotency check:** if a completed report already exists with identical `{ sessionId, sorted scribeIds }` → **no-op** success.
9) **Write outputs:**
   - **Completed session report** (`data/session-reports/session-####.yaml`)
     - Create if no report exists; if a **planned** report exists and git is **clean**, replace with **completed** (immutable).
     - Persist: `id`, `status: "completed"`, `sessionDate`, `gameStartDate`, `gameEndDate`, `scribeIds[]`, attendance, and per-character pillar results.
   - **Ledger entries**
     - Append one `session_ap` per (session, character) with:
       - `sessionId`, `characterId`
       - `pillars.{combat|exploration|social}: { delta, reason, note? }` (reason chosen as above)
       - (Optional) `source` metadata incl. `scribeIds[]`, if supported.

---

## 6) Writes & Idempotency

- **Completed report:**
  - Created even if **no planned** report exists.
  - If a planned report exists: require **clean git** (else **fail**). On success, it becomes the completed report.
- **Ledger:**
  - Append on first apply only. Re-runs with same fingerprint add **no** duplicate entries.
- **Fingerprint:** `{ sessionId, sorted scribeIds }`.

---

## 7) Data Contract Touchpoints (semantics)

- **Session report**
  - `id: "session-####"`, `status: "planned"|"completed"`.
  - `scribeIds[]`: **all** finalized log part basenames for the session (sorted).
  - `sessionDate`: earliest real-world timestamp across parts.
  - `gameStartDate`/`gameEndDate`: from in-world events (if present).
  - `attendance.characterIds[]`: log-derived; `attendance.guests[]` optional.
- **Ledger**
  - `session_ap`:
    - `pillars.{combat|exploration|social}` → `{ delta: number, reason: "normal"|"grandfathered"|"cap", note?: string }`.
  - **Tier source:** character **tier is derived from level** at apply-time (missing level ⇒ Tier 1).
  - **Event gate:** AP events use `{ number, maxTier }` (missing ⇒ 1).

---

## 8) Errors & Exit Behavior

- **Auto-mode:** “No finalized logs for any pending session after session-NNNN.”
- **Explicit:** “No finalized logs for <sessionId>.”
- **Dirty git:** “Planned report exists for <sessionId>, but the working tree is dirty. Commit or stash changes, then re-run.”
- **Completed conflict:** “Completed report for <sessionId> has a different scribeIds set. Revert the prior apply or use a new session.”
- **Parse/schema errors:** include file path and offending record context.

Success (created or idempotent) → exit 0. Failures → non-zero.

---

## 9) Examples

```bash
# Auto-mode: pick first pending with logs
weave ap apply
# -> finds highest completed: session-0019
# -> discovers logs for session-0020 and session-0021
# -> chooses session-0020 (smallest pending), applies

# Explicit mode
weave ap apply session-0021

# Planned report exists but git is dirty
weave ap apply
# -> error: planned report exists for session-0020 but working tree is dirty
#    hint: git add -A && git commit -m "Plan 0020"  OR  git stash -u

# Idempotent re-run
weave ap apply session-0020
# -> same fingerprint; no-op
```

---

## 10) Future Integration Notes

- **Orchestrator:** `weave apply` may call `weave ap apply` as a sub-step (trails → AP → hex updates).
- **Override discovery (later, if needed):** allow `--scribe-id <basename>` (repeatable) to pin the exact set; fingerprint still uses the sorted effective set.
- **Audit:** consider recording `scribeIds[]` on each `session_ap.source` for traceability.

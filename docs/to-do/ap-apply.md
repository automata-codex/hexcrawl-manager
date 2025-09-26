Here’s a tight, actionable to-do list for **`weave ap apply`**—no fluff, just what to build.

# `ap-apply` To-Do

## A) Wire-up & Inputs

* [x] **CLI surface**
  * Explicit: `weave ap apply <session-####>`
  * Auto (Option R): `weave ap apply` (no arg)
* [ ] **Paths & config**: constants for `SESSION_REPORTS_DIR`, `SCRIBE_SESSIONS_DIR`, `LEDGER_PATH`.
* [ ] **Schemas in scope**: import TS types from `/schemas/session-report.ts` and `/schemas/ap-ledger.ts`. Use only schema fields.

## B) Session resolution

* [ ] **Read completed reports** → collect completed session numbers.
* [ ] **Scan logs** (`data/session-logs/sessions/`) for `session_####_*.jsonl` and `session_####[a-z]_*.jsonl` → collect session numbers with finalized logs.
* [ ] **Option R**: pick the smallest session number `> max(completed)` from the “has logs” set. If none → fail with clear message.
* [ ] **Explicit mode**: validate that `<session-####>` has logs; else fail.

## C) Scribe part discovery

* [ ] **Glob** both patterns for the chosen session; union the sets; ensure **non-empty**.
* [ ] **Sort basenames** using `sortScribeIds` (by date, then suffix: none < a < b < …).
* [ ] **Fingerprint** = `{ sessionId, sorted scribeIds }` (basenames only).

## D) Preflight guards

* [ ] If a **completed report** exists for this `sessionId`:
  * [ ] If its fingerprint matches → **no-op success** (exit 0).
  * [ ] Else → **hard fail** (immutable mismatch), print guidance.
* [ ] If a **planned report** exists:
  * [ ] **git dirty check** (`git status --porcelain` must be empty) or **fail** with guidance.
* [ ] Validate character ids encountered in logs resolve to known character files; else **fail** with specific ids/paths.

## E) Parse logs → derive session data

* [ ] **Read JSONL** from all parts (in sorted order).
* [ ] **Attendance**: build `attendance.characterIds[]` from participation/attendance events (unique, sorted).
* [ ] **Guests**: collect non-character participants into `attendance.guests[]` (name, optional note).
* [ ] **AP events**: for each character, collect per-pillar events `{ number, maxTier?, note? }` (default `maxTier=1`).
* [ ] **In-world dates**: extract `gameStartDate` and `gameEndDate` if present.
* [ ] **Real-world time**: compute `sessionDate` = **earliest** timestamp across all parts; `gameEndDate` (real-world) is not stored—only in-world end if schema supports it.
* [ ] **Downtime**: if logs carry downtime entries, map them into the completed report per schema (presence used by `status` to block credits).

## F) Per-character computation

* [ ] **Load level** from character files; **derive tier** (1–4→T1, 5–10→T2, 11–16→T3, 17–20→T4; missing ⇒ T1).
* [ ] For each pillar:
  * [ ] Run **event-level gate** with session era:
    * **≤0019**: include over-tier events; if any contributed → `reason:"grandfathered"`, else `"normal"`.
    * **≥0020**: **exclude** over-tier events; if any excluded → `reason:"cap"`, else `"normal"`.
  * [ ] Sum eligible `number`s → `delta`.
  * [ ] **Note**: propagate (e.g., last note seen for that pillar) into `note?`.
* [ ] If an attending character has **no AP** events at all → `{ delta: 0, reason: "normal" }` for each pillar.

## G) Writes

* [ ] **Completed session report** (`data/session-reports/session-####.yaml`)
  * Fields: `id`, `status:"completed"`, `scribeIds[]` (basenames, sorted), `sessionDate`, `gameStartDate?`, `gameEndDate?`, `attendance{characterIds[], guests[]?}`, per-character pillar results, and `downtime[]` if present.
  * Replace planned only after **clean git** check.
* [ ] **Ledger append** (append-only)
  * One `session_ap` per (session, character) with:
    * `sessionId`, `characterId`
    * `pillars.{combat|exploration|social}: { delta, reason, note? }`
    * (Optional) `source.scribeIds[]`, `source.appliedAt`
* [ ] **Idempotency**: ensure on re-run with same fingerprint no duplicate entries are added.

## H) Errors & messages

* [ ] No logs found for target session → fail with explicit glob patterns checked.
* [ ] Planned exists + dirty git → fail with commit/stash guidance.
* [ ] Completed exists with different fingerprint → fail with clear diff (old vs new `scribeIds[]`).
* [ ] Unknown characters in logs → fail listing offending ids.
* [ ] Schema parse/validation failures → fail with file and line context if possible.

## I) Tests to implement (from `ap-test-matrix`)

* [ ] A-01: Auto-mode picks smallest pending with logs.
* [ ] A-02/A-03: No logs (auto/explicit) → fail.
* [ ] A-04: Multi-part ordering + `scribeIds[]` union.
* [ ] A-05: Guests captured in completed report.
* [ ] A-06: Attendance-only → zeros with `reason:"normal"`.
* [ ] A-07..A-11: Event gating across eras, missing `maxTier`, tier from level.
* [ ] A-12: Planned exists + dirty → fail.
* [ ] A-13: Idempotent re-run (same fingerprint).
* [ ] A-14: Completed conflict (different `scribeIds[]`) → fail.

## J) Nice-to-have (later)

* [ ] Optional `source.scribeIds[]` recorded on each ledger entry for traceability.
* [ ] Richer error context (point to the exact JSONL line that broke).
* [ ] CLI flag to override auto-mode’s choice (keep off by default per spec).

# AP Workflow Overview

> **File:** `docs/specs/ap-workflow-overview.md`
>
> **Audience:** engineers & toolsmiths working on `scribe`/`weave` and AP automation
>
> **Sources of truth:** scribe logs → session reports → AP ledger (schemas in top-level `/schemas`)

---

## 1) Purpose & Scope

Establish a clear, deterministic workflow for awarding and tracking Advancement Points (AP) from play logs, producing immutable session reports, and maintaining a canonical AP ledger.

This document explains **what the system does** and **where each responsibility lives**. Individual command specs live in `docs/specs/weave-commands/`.

**Non-goals:** migration steps (one-time script; see `docs/dev/migrations/2025-ap-ledger-migration.md`) and schema definitions (see `/schemas`).

---

## 2) Canonical Data Sources

1) **Scribe logs** (`session-####_YYYY-MM-DD.jsonl`), possibly **multi-part**
   - A single session’s finalized logs may be split across multiple files named:
     `session-####[a-z]?_YYYY-MM-DD.jsonl` (suffix `a`, `b`, … optional).
   - Logs are written during play and become **finalized** when `scribe finalize` moves them from `data/session-logs/in-progress/` → `data/session-logs/sessions/`.
   - **Presence under `/sessions/` is sufficient** to count as finalized.

2) **Session reports** (`data/session-reports/session-####.yaml`)
   - `planned` before play; `completed` after `weave ap apply`.
   - Completed reports are **immutable** snapshots of attendance and AP results **from logs**.

3) **AP ledger** (canonical from session-0001)
   - Append-only records of per-session AP (`session_ap`) and `absence_spend`.
   - **Ledger is the canonical AP history.**

---

## 3) Lifecycle (Plan → Play → Finalize → Apply → Status → Allocate)

### A. Plan
- `session` bootstraps the next **planned** report at `data/session-reports/session-####.yaml`.
- Planned reports include agenda, notes, `gameStartDate`; **no** `characterIds` or AP.

### B. Play (scribe)
- Scribe emits JSONL log part(s) for the session into `in-progress/`.

### C. Finalize (scribe)
- `scribe finalize` moves all parts for the session into `/sessions/`.
- **Definition of “finalized” = file present under `/sessions/`.**

### D. Apply (weave)
- **Scribe ID discovery:** For `session-####`, `weave ap apply` **discovers** all finalized parts by filename:
  `data/session-logs/sessions/session-####[a-z]?_*.jsonl`.
  - If **no files are found** → **fail** (“no finalized logs for session”).
  - Command processes **all** discovered parts; no partial apply.
- **Auto-mode session resolution:** When `<sessionId>` is omitted, pick the **smallest** pending session number that has finalized logs and is **greater** than the highest **completed** session number.
- **Parse order:** process all discovered parts in chronological order; if timestamps tie, order by suffix `a` < `b` < `c`….
- **Derived fields & writes:**
  - **Attendance** is derived strictly from logs; record guests in `attendance.guests[]` (informational only).
  - Compute per-character pillar deltas with reasons (see §6) and optional `note` (from log events).
  - Write a **completed** session report that lists **all** discovered `scribeIds[]` (basenames).
  - Append corresponding ledger entries.
  - Set `sessionDate` to the **earliest** real-world timestamp across all parts; set `gameEndDate` to the **latest**.
- **Idempotency:** re-running with the same fingerprint is a no-op.
  - **Fingerprint:** `{ sessionId, sorted scribeIds }`.
- **Preflight hard-fail:** if a planned report exists and the git working tree is **dirty**; if any required logs are missing.

### E. Status (read-only)
- `weave ap status` folds the ledger to report per-character pillar totals.
- **Absence credits are derived at runtime** (Tier 1 and **not** in downtime) and **not persisted**.

### F. Allocate (spend credits)
- `weave ap allocate` records **absence spends** in the ledger and updates the **most recent completed** report’s `absenceAllocations[]`.
- Tier 2+ spends display as `absence_spend` **only** (no pillar deltas).

---

## 4) Roles & Boundaries

- **`session`**: creates *planned* report only. No ledger writes.
- **`weave ap apply`**: the **only** writer of *completed* reports and per-session ledger entries.
- **`weave ap status`**: read-only aggregation; calculates absence credits on the fly.
- **`weave ap allocate`**: writes `absence_spend` to ledger and appends to latest *completed* report.
- **Migration script**: one-time content transformer; ends with a reconcile artifact (not a command).
- **Future consolidation:** `weave apply` will act as an orchestrator that runs idempotent sub-steps (trails → AP → hex updates). `weave ap apply` remains callable directly and/or as a sub-step until deprecated.

---

## 5) Invariants & Idempotency

- **Completed reports are immutable.** Any attempt to “re-apply” must be a no-op if the fingerprint matches.
- **Idempotency fingerprint for `apply`:** `{ sessionId, sorted scribeIds }`.
- **Apply preflight:** fail if no finalized `scribeIds[]` are discovered under `/sessions/`.
- **Session ordering & uniqueness:** sessions are unique by their `####` **sequence number**. Multiple sessions may share the same `sessionDate`.
- **Attendance is log-derived** (no roster source of truth).
- **Ledger is append-only** and canonical from session-0001.

---

## 6) Deterministic Rules (AP & Absence)

### Tier & Reason Rules
**Reason codes (system-wide):** `"normal" | "cap" | "absence_spend" | "downtime" | "correction" | "grandfathered"`.
`weave ap apply` only emits: `"normal"`, `"cap"`, `"grandfathered"`.
`"absence_spend"` is created by **allocate**; `"downtime"` and `"correction"` may be created by future commands or manual fixes.

- **Character tier is derived from level** (no stored tier):
  - Level **1–4 → Tier 1**, **5–10 → Tier 2**, **11–16 → Tier 3**, **17–20 → Tier 4**.
  - **Missing level** ⇒ treat as **Tier 1**.
- **Each AP event has** `{ number, maxTier }` (see `/schemas`); this is an **event-level gate**:
  - A character of tier **T** earns an event iff **T ≤ event.maxTier**.
  - **Missing `event.maxTier`** ⇒ treat as **1**.
- **Sessions ≤ 0019** (grandfather policy):
  - If any event for a pillar is above the character’s tier (T > event.maxTier), that event is still **included** and the pillar’s `reason` is **"grandfathered"**.
  - If no over-tier events contributed, use **"normal"**.
- **Sessions ≥ 0020** (cap policy):
  - Events above the character’s tier are **excluded** (do not contribute to the pillar sum).
  - If any exclusion occurred for a pillar, set that pillar’s `reason` to **"cap"**; otherwise **"normal"`.
- **Missing AP in logs (for an attending character)** → record `delta: 0, reason: "normal"`.

### Absence Credits & Spends
- **Credits are derived at runtime** (never stored):
  - 1 credit per missed session **only if** the character is **Tier 1** **and** **not in downtime** that session.
  - **Any downtime entry** for the session counts as “in downtime” (no credit).
- **Spends are persisted**:
  - Ledger gets an `absence_spend` entry.
  - The **most recent completed** session report’s `absenceAllocations[]` is updated.
  - **Tier 2+**: show as `absence_spend` only (no pillar deltas).

---

## 7) Field Semantics Used by Commands (high level)

> Schemas live in `/schemas`; this is how commands interpret key fields.

- **Session report**
  - `id: "session-####"`; `status: "planned"|"completed"`.
  - `scribeIds[]`: **all** finalized log part basenames for the session under `/sessions/`.
  - `sessionDate`: **earliest** real-world timestamp across all parts; `gameEndDate`: **latest`.
  - `gameStartDate`: from logs.
  - `attendance.characterIds[]`: derived from logs (guests excluded from AP).
  - `attendance.guests[]` (optional): `[{ name, note? }]` for guest players; **informational only** (no AP/credits/ledger).
  - `absenceAllocations[]`: appended by `allocate` (latest completed report only).
  - **Pillar reason selection:** for ≤0019, any over-tier contribution ⇒ `"grandfathered"`; for ≥0020, any over-tier exclusion ⇒ `"cap"`; otherwise `"normal"`.

- **Ledger**
  - `session_ap` (one per (session, character)):
    - `pillars.{combat|exploration|social}` → `{ delta: number, reason: "normal"|"grandfathered"|"cap", note?: string }`.
  - `absence_spend`: standalone entries for spends (Tier 2+ shows only this).

---

## 8) Error Handling & Exit Codes (policy)

- **No finalized logs discovered** for a session → `apply` fails (no writes).
- **Conflicting existing completed report** (different `scribeIds` for same session) → fail with guidance to revert or create a new session.
- **Schema mismatch / unreadable logs** → fail with actionable message.
- **Status/Allocate** return non-zero on validation failures and print which file/character failed.

(Exact exit codes are defined per command spec.)

---

## 9) Glossary

- **AP (Advancement Points):** progress tracked across three pillars: combat, exploration, social.
- **Pillar delta:** `{ delta, reason, note? }` awarded to a character for a session.
- **Absence credit:** a runtime-derived token for Tier-1 non-downtime absences; not stored.
- **Absence spend:** a persisted use of credits; recorded in the ledger + latest completed report.
- **Finalize (scribe):** move logs to `/sessions/`; sufficient to mark as finalized.
- **Apply (weave):** transform finalized logs into an immutable completed report + ledger entries.

---

## 10) Cross-References

- Command specs: `docs/specs/weave-commands/`
  - `ap-apply.md`, `ap-status.md`, `ap-allocate.md`, `session.md`
- Data semantics reference: `docs/specs/data-contracts.md`
- Migration (one-time): `docs/dev/migrations/2025-AP-ledger-migration.md`
- Test plan: `docs/dev/ap-test-matrix.md`

---

## 11) Quick Checklist (for implementers)

- [ ] `scribe finalize` moved all log parts to `/sessions/`.
- [ ] `weave ap apply` discovered **all** `session-####[a-z]?_*.jsonl` parts → proceed; else **fail**.
- [ ] Completed report is written once; subsequent applies are no-ops for the same `{ sessionId, sorted scribeIds }`.
- [ ] Ledger entries follow event-level gating and session-era rules (≤0019 grandfather / ≥0020 cap).
- [ ] `status` derives absence credits (Tier 1 & not in downtime) without persisting.
- [ ] `allocate` writes `absence_spend` and updates **latest completed** report’s `absenceAllocations[]`.

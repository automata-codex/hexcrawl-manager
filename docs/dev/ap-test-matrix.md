# AP Test Matrix

> **File:** `docs/dev/ap-test-matrix.md`
>
> **Scope:** Black-box tests for `weave session`, `weave ap apply`, `weave ap status`, and `weave ap allocate`.
>
> **Assumptions:** Schemas live in `/schemas`. Tier is **derived from level** (1–4→T1, 5–10→T2, 11–16→T3, 17–20→T4; missing level ⇒ T1). AP events carry `{ number, maxTier }` (missing maxTier ⇒ 1). Reasons system-wide: `"normal" | "cap" | "absence_spend" | "downtime" | "correction" | "grandfathered"`.

---

## 0) Fixtures & Conventions

* **Characters**

  * `c_t1`: level 3 (Tier 1)
  * `c_t1_missing_level`: no level (Tier 1 by default)
  * `c_t2`: level 6 (Tier 2)
  * `c_t3`: level 12 (Tier 3)
* **Sessions & logs**

  * File roots: `data/session-logs/sessions/`
  * Single-part: `session-0020_2025-09-10.jsonl`
  * Multi-part: `session-0021a_2025-09-17.jsonl`, `session-0021b_2025-09-17.jsonl`
  * ≤0019 vs ≥0020 coverage: `session-0019_*` (grandfather era), `session-0020_*` (cap era)
* **Guests & downtime**

  * Guests recorded in logs → expect `attendance.guests[]` in completed report
  * Any downtime record for a character in a completed report blocks absence credit
* **Planned reports**

  * When present, live at `data/session-reports/session-####.yaml` with `status: "planned"`
* **Git**

  * “Clean” means `git status --porcelain` is empty

---

## 1) `weave session` (planned report bootstrap)

| ID   | Scenario                        | Setup                                            | Action                                   | Expected                                                                                          |
|------|---------------------------------|--------------------------------------------------|------------------------------------------|---------------------------------------------------------------------------------------------------|
| S-01 | Clean repo, new planned         | `meta.nextSessionSeq=24`, no `session-0024.yaml` | `weave session --agenda "A" --notes "N"` | Creates `session-0024.yaml` with `status:"planned"`, fields set; does **not** modify `meta.yaml`. |
| S-02 | Collision on planned (no force) | `session-0024.yaml` exists (planned)             | `weave session`                          | Fails with collision guidance.                                                                    |
| S-03 | Collision on planned (force)    | Same as S-02                                     | `weave session --force`                  | Overwrites planned file; completed files are **never** overwritten.                               |
| S-04 | Collision on completed          | `session-0024.yaml` exists (completed)           | `weave session --force`                  | Fails: completed reports are immutable.                                                           |
| S-05 | Dirty repo (no force)           | Unstaged changes                                 | `weave session`                          | Fails with clean-git guidance (or allow with `--force` per spec).                                 |

---

## 2) `weave ap apply` (auto-mode Option R, multi-part, event gating, idempotency)

| ID   | Scenario                                   | Setup                                                                          | Action                        | Expected                                                                                                           |
|------|--------------------------------------------|--------------------------------------------------------------------------------|-------------------------------|--------------------------------------------------------------------------------------------------------------------|
| A-01 | Auto-mode picks smallest pending with logs | Highest completed: 0018; logs present for 0020 & 0021                          | `weave ap apply`              | Chooses 0020; discovers all parts; writes completed report & ledger.                                               |
| A-02 | No logs for any pending                    | Highest completed: 0019; no logs >0019                                         | `weave ap apply`              | Fails: “no finalized logs for any pending session after session-0019”.                                             |
| A-03 | Explicit session missing logs              | None                                                                           | `weave ap apply session-0022` | Fails: “no finalized logs for session-0022”.                                                                       |
| A-04 | Multi-part merge & ordering                | Logs: `0021a`, `0021b` same date; timestamps tie                               | `weave ap apply session-0021` | Processes parts in suffix order (a\<b). `scribeIds[]` includes both; `sessionDate`=earliest; `gameEndDate`=latest. |
| A-05 | Guests captured                            | Logs include non-character participants                                        | Apply                         | Completed report contains `attendance.guests[]`; guests not in AP or credits.                                      |
| A-06 | Attendance-driven, no AP → zeros           | Character attends but has no AP events                                         | Apply                         | Per-pillar `{delta:0, reason:"normal"}` for that character.                                                        |
| A-07 | ≤0019 grandfather: over-tier included      | `session-0019_*`; `c_t2` attends; AP event `{number:2, maxTier:1}`             | Apply                         | Pillar adds `+2` with `reason:"grandfathered"`.                                                                    |
| A-08 | ≥0020 cap: over-tier excluded              | `session-0020_*`; `c_t2` attends; AP event `{2, maxTier:1}`                    | Apply                         | Pillar ignores event; reason `"cap"` if any exclusion occurred; otherwise `"normal"`.                              |
| A-09 | Mixed events same pillar                   | `session-0020_*`; `c_t2` attends; events `{2, maxTier:2}` and `{2, maxTier:1}` | Apply                         | Sum only eligible events (`+2`); pillar `reason:"cap"` (an over-tier was excluded).                                |
| A-10 | Missing event maxTier defaults to 1        | Event `{number:1}` (no maxTier), `c_t2` attends, ≥0020                         | Apply                         | Excluded; pillar reason `"cap"` if it was the only event.                                                          |
| A-11 | Tier from level; missing level ⇒ T1        | `c_t1_missing_level` attends; ≥0020; event `{1, maxTier:1}`                    | Apply                         | Included with `reason:"normal"`.                                                                                   |
| A-12 | Planned report exists, dirty git           | Planned file present; repo dirty                                               | Apply                         | Fails: requires clean git to replace planned with completed.                                                       |
| A-13 | Idempotency (same fingerprint)             | Completed exists with same `{sessionId, sorted scribeIds}`                     | Apply again                   | No-op success; ledger not double-appended.                                                                         |
| A-14 | Completed conflict (different scribeIds)   | Completed exists with set X; logs now set Y                                    | Apply                         | Fails with guidance (immutable, revert or new session).                                                            |

---

## 3) `weave ap status` (totals & credits)

| ID    | Scenario                        | Setup                                                 | Action                                      | Expected                                                                                 |
|-------|---------------------------------|-------------------------------------------------------|---------------------------------------------|------------------------------------------------------------------------------------------|
| ST-01 | Sum pillars across reasons      | Ledger has `session_ap` with reasons mix              | `weave ap status`                           | Totals per pillar equal sum across all reasons (`normal/cap/grandfathered/...`).         |
| ST-02 | Credits basic earn              | `c_t1` absent, not in downtime, Tier 1                | Status                                      | Earns +1 credit for that session.                                                        |
| ST-03 | Credits blocked by downtime     | `c_t1` absent **but** downtime present                | Status                                      | Earns 0 credit.                                                                          |
| ST-04 | Tier ≥2 never earns             | `c_t2` absent, not in downtime                        | Status                                      | Earns 0 credit.                                                                          |
| ST-05 | Missing level ⇒ Tier 1          | `c_t1_missing_level` absent, not in downtime          | Status                                      | Earns +1 credit.                                                                         |
| ST-06 | Never attended; no intro marker | Character never appears in attendance across sessions | Status                                      | Earns 0 credits by default (no runaway accrual).                                         |
| ST-07 | Windowing                       | Variety of sessions 0016–0023                         | `--since session-0019 --until session-0021` | Pillar totals & credits reflect only in-window sessions; report window echoed in output. |
| ST-08 | Guests do not affect credits    | Session has only guests                               | Status                                      | No credits produced for any character.                                                   |
| ST-09 | Spends reduce available         | Ledger has `absence_spend.amount=2`                   | Status                                      | `available = max(0, earned - 2)`.                                                        |

---

## 4) `weave ap allocate` (Tier-1 only; human output)

| ID    | Scenario                      | Setup                                                | Action                                                                      | Expected                                                                                                                                                 |
|-------|-------------------------------|------------------------------------------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------|
| AL-01 | Basic Tier-1 allocation       | Latest completed exists; `c_t1` has `available=3`    | `--character c_t1 --amount 3 --combat 1 --exploration 2 --note "Missed 21"` | Appends ledger `absence_spend` with pillars `1/2/0`, `sessionIdSpentAt=<latest>`; appends report `absenceAllocations[]` row; prints human table; exit 0. |
| AL-02 | Pillar sum must match amount  | As above                                             | `--amount 3 --combat 1 --exploration 1`                                     | Fails: mismatch; no writes.                                                                                                                              |
| AL-03 | Insufficient credits          | `available=1`                                        | `--amount 2 --exploration 2`                                                | Fails: shows earned/spent/available; no writes.                                                                                                          |
| AL-04 | Tier-2+ blocked               | `c_t2` derived tier >1                               | `--amount 1 --exploration 1`                                                | Fails: spends not supported for Tier-2+.                                                                                                                 |
| AL-05 | Dirty repo guard              | Latest completed exists; repo dirty                  | Allocate                                                                    | Fails: requires clean git to append to completed report.                                                                                                 |
| AL-06 | Multiple characters           | `c_t1 available=3`, `c_t1_missing_level available=1` | Two `--character` groups                                                    | Both validated and written; each listed in output; exit 0.                                                                                               |
| AL-07 | No completed report to attach | No completed reports                                 | Allocate                                                                    | Fails: “no completed report to attach allocation to”.                                                                                                    |

---

## 5) Cross-command Integrity

| ID   | Scenario              | Setup                                           | Actions                   | Expected                                                                                                                                       |
|------|-----------------------|-------------------------------------------------|---------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| X-01 | Apply → Status        | After A-07 and A-08                             | Run Status                | Pillar totals match ledger; reasons carried through; credits unaffected by guests.                                                             |
| X-02 | Allocate → Status     | After AL-01                                     | Run Status                | Available reduced accordingly; if you choose to show pillar gains from spends in Status, they are derived from ledger `absence_spend.pillars`. |
| X-03 | Fingerprint stability | Apply, then rename file order                   | Re-run Apply              | No-op: fingerprint uses **sorted** `scribeIds[]`.                                                                                              |
| X-04 | Multi-part timing     | Parts with different earliest/latest timestamps | Apply then inspect report | `sessionDate` = global earliest; `gameEndDate` = global latest.                                                                                |

---

## 6) Edge Cases

* **Event with no `maxTier`:** treat as `1`; verify ≥0020 excludes it for Tier>1 with `reason:"cap"`.
* **All over-tier in ≥0020:** pillar delta becomes 0, `reason:"cap"`.
* **Mix of eligible & over-tier in ≤0019:** full sum included; `reason:"grandfathered"`.
* **Multiple sessions same `sessionDate`:** ordering strictly by session number; status and apply unaffected.
* **Planned report present for target session:** apply requires **clean git** to replace with completed.
* **Unknown character in logs:** apply should fail loudly with path+character ID (or skip with explicit warning if that’s your policy).

---

## 7) Minimal Fixtures to Author

Create reusable JSONL snippets for logs:

* **Attendance only:** no AP events (tests zeros).
* **AP (eligible):** `{"pillar":"combat","ap":{"number":2,"maxTier":2},"note":"Boss"}`.
* **AP (over-tier):** `{"pillar":"exploration","ap":{"number":2,"maxTier":1},"note":"Secret"}}`.
* **Guest add:** `{"guest":{"name":"Table Friend","note":"one-shot"}}`.
* **Downtime:** whatever shape your schema expects; ensure presence in completed report for the blocking tests.

---

## 8) Run Order Suggestions (happy path)

1. S-01 → A-01 → ST-01/02 → AL-01 → ST-09
2. A-04 (multi-part) → X-04
3. A-07/08/09/10 (gating) → ST-01
4. AL-03/04/05 (guards)

---

## 9) Out-of-Scope (for this matrix)

* One-time migration script specifics (covered in its own doc).
* Hex/trail orchestration under `weave apply` (future consolidation).

---

**Tip:** Keep each test’s repo state under git so guards are exercised naturally (`clean` vs `dirty`).

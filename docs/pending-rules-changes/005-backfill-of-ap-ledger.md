# One-Time Backfill of Sessions → Ledger (Sessions 1..N)

**ID:** 005
**Status:** Proposed
**Owner:**
**Date Opened:** 2025-09-23
**Source:** [Project convo](https://chatgpt.com/g/g-p-6793ffedbea881918085a8d0a3955188/c/68d29abf-c45c-8324-b70f-d873497de8c7)
**Affects:** `scripts/ap_backfill.ts`; Data migration notes; Dev docs

---

## Summary of Software Behavior

A single script imports historical session reports into per-character AP ledgers from **session 1** onward, respecting the **grandfather ≤ 19** rule, and leaving absence credits **derived**.

## Current Rules Text (canonical)

> No backfill exists; AP totals are maintained manually.

## Proposed Rules Update

* Implement `scripts/ap_backfill.ts`:

  * For each session in order:

    * Numeric group AP → write one `session_ap` per (PC,pillar).
    * Non-attendees not in `downtime[]` → **no write** (credits are derived).
    * `absenceAllocations[]` → write pillar `session_ap` (Tier-1 only advancement).
  * Mark sessions **≤19** outcomes as `grandfathered` when relevant; enforce caps ≥20.
* Emit a JSON report:

  * Sessions with `'-'` gaps by pillar.
  * Allocations applied.
  * Any spends blocked by Tier-1 rule.

## Open Questions / Decisions Needed

* None.

## Migration Notes (if any)

* After backfill, all balances/credits are materialized by folding the ledger + session attendance; no ongoing “import mode.”

## Acceptance Criteria / Tests

* Backfill is **idempotent** (reruns produce no duplicates).
* Post-backfill fold matches historical totals for all PCs (modulo known `'-'` gaps).
* Grandfather boundary behavior verified with at least one over-award case.

## Links

* Spec/PR: (to be added)
* Related conversations: This thread
* Commits: (to be added)

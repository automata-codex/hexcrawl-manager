# Canonical AP Ledger + Absence Credits (Tier-1 Cap, Grandfather ≤ Session 19)

**ID:** 003
**Status:** Proposed
**Owner:**
**Date Opened:** 2025-09-23
**Source:** [Project convo](https://chatgpt.com/g/g-p-6793ffedbea881918085a8d0a3955188/c/68d29abf-c45c-8324-b70f-d873497de8c7)
**Affects:** Rules: Character Advancement; Site rendering of session AP; `state/ledgers/characters/*.ap.jsonl`

---

## Summary of Software Behavior

Shift from mutable AP totals to an **append-only ledger** starting at session 1. Absence credits are **derived** (not stored) and may only advance Tier 1. AP awards through **session 19 (inclusive)** are grandfathered as awarded; from session 20+ caps are enforced.

## Current Rules Text (canonical)

> Characters track AP totals per pillar; absence AP and tier interactions are not explicit. No formal ledger or grandfather clause exists.

## Proposed Rules Update

* **Ledger is canonical from Session 1.**
* **Reasons enum** includes: `normal`, `cap`, `absence_spend`, `correction`, `grandfathered`.
* **Absence credits (derived):**

  * Anyone not on the attendee list and not in `downtime[]` earns **+1 unallocated AP** for that session.
  * Credits are computed from session attendance over time; they are **not stored** as entries.
* **Tier-1 cap for absence credits:**

  * Credits can only advance **Tier 1**.
  * At Tier 2+, credits may be “allocated” for bookkeeping but **do not produce pillar deltas** (no advancement).
* **Grandfather window:** All awards **≤ session 19** stand as recorded (`reason: 'grandfathered'` where relevant). From **session 20+**, enforce caps.

## Open Questions / Decisions Needed

* None (policy chosen).

## Migration Notes (if any)

* When recomputing credits, simulate tier per character in session order so Tier-2+ sessions **do not** grant absence credits retroactively.

## Acceptance Criteria / Tests

* A Tier-2 PC spending credits produces no pillar deltas (and logs the spend intent).
* A Tier-1 PC spending credits writes pillar deltas; optional pillar caps apply per Tier-1 rules.
* Sessions ≤ 19 preserve over-awards; sessions ≥ 20 clamp and mark `cap`.

## Links

* Spec/PR: (to be added)
* Related conversations: This thread
* Commits: (to be added)

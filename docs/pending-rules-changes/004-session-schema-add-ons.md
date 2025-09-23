# Session Schema Add-Ons: `downtime[]`, `absenceAllocations[]`, Reasons, Canonical Dates

**ID:** 004
**Status:** Proposed
**Owner:**
**Date Opened:** 2025-09-23
**Source:** [Project convo](https://chatgpt.com/g/g-p-6793ffedbea881918085a8d0a3955188/c/68d29abf-c45c-8324-b70f-d873497de8c7)
**Affects:** Session schema; Rules docs (“Session Reports”); Character Advancement wording

---

## Summary of Software Behavior

Augment session files with minimally invasive blocks to support absence policy and allocations, and formalize date types and reasons.

## Current Rules Text (canonical)

> Session files contain agenda, attendees, and group AP, with `'-'` placeholders. No first-class absence or downtime fields. In-game dates are informal strings.

## Proposed Rules Update

* **Add (optional) `downtime[]`:**

  * `{ characterId, kind: 'crafting'|'training'|'research'|'travel'|'other', notes? }`
  * Absentees listed here **do not** earn the +1 absence credit for that session.
* **Add (optional) `absenceAllocations[]`:**

  * `{ characterId, allocations: { combat, exploration, social }, notes? }`
  * `consumes` is **not** stored; it’s computed as the sum of allocations.
* **Reasons enum** (for ledger entries): `normal`, `cap`, `absence_spend`, `correction`, `grandfathered`.
* **Date types:**

  * Use `CanonicalDate` for in-game dates; use `IsoDateTime` for real-world timestamps.

## Open Questions / Decisions Needed

* None; aligns with chosen absence workflow and existing rendering of `'-'`.

## Migration Notes (if any)

* No rewrite of historical sessions required; these fields are optional and can be added going forward or retro-filled as needed.

## Acceptance Criteria / Tests

* Session with `downtime` excludes those PCs from derived credits.
* Session with `absenceAllocations` produces pillar deltas (or zero if Tier 2+).
* Schema validates: allocations are ints ≥ 0; reasons enum includes `grandfathered`.

## Links

* Spec/PR: (to be added)
* Related conversations: This thread
* Commits: (to be added)

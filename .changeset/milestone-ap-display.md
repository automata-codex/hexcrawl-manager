---
'@achm/cli': minor
---

Report milestone **AP** (not award counts) in the `weave status ap` milestone
table. The section is now labeled `Milestone AP:` and its Eligible / Claimed /
Unclaimed columns show advancement points rather than counts of milestone
awards.

- **Claimed** is the sum of the character's `milestone_spend` ledger deltas
  (combat + exploration + social), mirroring how the per-pillar AP table already
  aggregates them — replacing the previous "one per ledger entry" count.
- **Eligible** is the sum of per-session top-ups
  (`max(0, MILESTONE_AP_CAP − sessionTotal)`) across the milestone-bearing
  sessions the character attended, reading each `sessionTotal` from their
  `session_ap` ledger entries. The cap is per session, so multiple milestone
  events in one session collapse to a single top-up. Sessions whose pillar AP
  hasn't been applied yet have no computable top-up and default to the full cap
  (3), self-correcting once `weave apply ap` runs.
- **Unclaimed** is `max(0, eligible − claimed)`, now in AP.

The `MILESTONE_AP_CAP` constant moves to `weave/lib/core/milestone-ap.ts` (a
shared `lib/core` home; `allocate-ap-milestone.ts` re-exports it) so the status
computation can use it without a command→command import. Allocation, apply, the
ledger schema, and the per-pillar "AP Status by Character" table are unchanged.

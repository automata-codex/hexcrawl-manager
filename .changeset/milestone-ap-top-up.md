---
'@achm/schemas': minor
'@achm/cli': minor
---

Replace the flat-3 milestone-grant model with a top-up model and split the
`weave allocate ap milestone` workflow into staging + apply phases.

**Behavior change:** A milestone now fills the gap between a character's
session pillar AP and a per-session cap of 3 AP. Pillar AP earned through
normal play is credited first; the milestone tops up the remainder. This
matches the campaign rules in the players guide. The `MILESTONE_AP_AMOUNT = 3`
constant has been removed; the new constant `MILESTONE_AP_CAP = 3` represents
the per-session cap, not a fixed grant.

**Workflow change:** `weave allocate ap milestone` no longer writes to the AP
ledger. Instead it stages an entry in the target session report's
`milestoneAllocations[]` array. `weave apply ap` is now the single writer for
both `session_ap` and `milestone_spend` ledger entries, reconciling staged
allocations against the per-character session pillar AP at apply time. This
gives natural order-independence — pillar AP and milestone allocation can
happen in either order and `apply` reconciles them.

**Schema (`@achm/schemas`):**
- Add `MilestoneEventSchema` (a structured `milestone` scribe event with
  `{ note, slug? }` payload). Replaces the legacy `todo` event with the
  `"Add AP for milestone:"` text prefix.
- Add `MilestoneAllocationSchema` and the `milestoneAllocations[]` field on
  `SessionHeader` (parallel to `absenceAllocations[]`).
- `MilestoneSpendEntrySchema.sessionId` semantics updated: it now refers to
  the session the milestone is tied to, not "where the entry was applied."

**CLI (`@achm/cli`):**
- `scribe ap milestone "<note>"` now emits a structured `milestone` event.
- `weave allocate ap milestone` requires `--session-id`, accepts pillar
  splits summing 0..3 (was strict =3), eagerly validates against existing
  `session_ap` when present, and stages intent in the report.
- `weave apply ap` adds Phase 2: reads `report.milestoneAllocations[]`,
  computes per-character topup from the just-written `session_ap`, strict-fails
  on mismatched sums, and appends `milestone_spend` ledger entries.
- `weave status ap` adds a Milestone Awards table mirroring Unclaimed Absence
  Awards.

**Breaking change:** `weave allocate ap milestone` no longer commits to the
ledger directly. Existing `milestone_spend` entries written under the
previous model continue to display correctly, but new allocations require
running `weave apply ap` to commit. See
`docs/specs/milestone-ap-reconciliation.md` for the full design and
`docs/plans/milestone-ap-reconciliation-implementation.md` for the migration
runbook.

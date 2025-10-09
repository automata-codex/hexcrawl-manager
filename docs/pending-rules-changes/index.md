# Pending Rules Changes (Tracker)

This index tracks **rules text that needs updating** to match current or upcoming software behavior. Use it to capture deltas quickly during development, then do thoughtful rewrites later.

> Workflow: When a code/spec change affects the rules, add an entry here linking to a short change note (created from the template). When you publish the final rewrite, mark the entry **Implemented** and link the commit/PR.

## Status Legend
- **Proposed** — noticed during development; needs review
- **Approved** — decision made; awaiting rewrite
- **In Progress** — rewrite underway
- **Implemented** — rewrite merged; link the commit
- **Dropped** — decision reversed or superseded

## Table of Pending Changes

|  ID | Title                          | Affects (Doc §)                                                                                                                           | Source (Spec/PR) | Status   | Owner | Link                                         |
|----:|--------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|------------------|----------|-------|----------------------------------------------|
| 001 | Trail Longevity and Permanence | `Hexcrawl Rules §Trail Formation and Use`; `docs/dev/session-lifecycle.md` (Finalize / season rollovers); Trail bookkeeping in data files | design notes     | Approved | —     | ./001-trail-longevity.md                     |
| 002 | AP Ledger Canonicalization     | `Character Advancement`; `Characters.yaml` (AP tracking)                                                                                  | convo notes      | Approved | —     | ./002-weave-processing-of-session-reports.md |
| 003 | Absence Credits and Allocation | `Character Advancement §Downtime Activities`; `SessionSchema` (absence handling)                                                          | convo notes      | Approved | —     | ./003-canonical-ap-ledger.md                 |
| 004 | Tier-Cap on Absence AP         | `Character Advancement §Downtime Activities`; AP awards in session/absence rules                                                          | convo notes      | Approved | —     | ./004-session-schema-add-ons.md              |
| 005 | Grandfathering Early AP Awards | `Character Advancement`; campaign ledger notes (Sessions 1–19)                                                                            | convo notes      | Approved | —     | ./005-backfill-of-ap-ledger.md               |

> Add rows at the end. Keep IDs zero-padded (e.g., 004, 005).

## How to Use

1. Copy `pending-change-template.md` into `docs/rules-sync/changes/` as `NNN-your-title.md`.
2. Add a row to the table above.
3. When the rewrite is merged, update **Status = Implemented** and add the commit link.

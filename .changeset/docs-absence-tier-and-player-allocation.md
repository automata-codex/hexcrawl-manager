---
'@achm/cli': patch
---

Align AP spec docs and a stale code comment with the rules of record and
the actual implementation.

- **Absence credits are not Tier-1-only.** The rules article
  (`character-advancement.md`) grants 1 absence AP per missed session to
  every absent character regardless of tier, and the implementation
  (`compute-unclaimed-absence-awards.ts`, `allocate-ap.ts`) has always
  matched. Only the spec docs claimed Tier-1 was a precondition. Removed
  the stale restriction from `ap-workflow-overview.md` (§3.E, §3.F, §6,
  §7, §9, §11) and `weave-commands/allocate-ap.md` (§1, §4, §5, §6, §9,
  §10, §11), plus a stale "Tier-1 credits" comment in
  `allocate-ap.ts`.
- **Pillar splits are player-chosen, not GM-chosen.** Per the rules of
  record, each player decides how to allocate their character's milestone
  topup and absence credit across pillars. The spec docs and migration
  runbook called these decisions GM judgment; corrected to reflect that
  the GM is the CLI operator who types in values supplied by each player.
  Updated `milestone-ap-reconciliation.md`, `ap-workflow-overview.md`,
  the implementation plan, and the migration runbook.

No behavior change.

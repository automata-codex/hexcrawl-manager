# `weave` Processes Session Reports & AP

**ID:** 002
**Status:** Proposed
**Owner:**
**Date Opened:** 2025-09-23
**Source:** [Project convo](https://chatgpt.com/g/g-p-6793ffedbea881918085a8d0a3955188/c/68d29abf-c45c-8324-b70f-d873497de8c7)
**Affects:** `cli/weave` spec; `sessions/<...>.json` docs; Pending Rules Changes

---

## Summary of Software Behavior

`weave` will ingest session reports (agenda + record) in addition to scribe logs/rollovers, and write canonical AP outcomes to per-character ledgers. It is the single “apply → audit → revert” path for session AP, absence allocations, and enforcement (tier caps, grandfather window).

## Current Rules Text (canonical)

> Session reports aren’t explicitly part of `weave`. AP is tracked as per-character totals, not a ledger. Absence handling and tier-cap behavior are not formally codified.

## Proposed Rules Update

* Extend `weave` scope to process **session reports**:

  * Attendees with numeric AP → write `session_ap` ledger entries.
  * Absentees (not in `downtime[]`) → earn *derived* absence credits (computed, not stored).
  * `absenceAllocations[]` → spend credits, writing pillar `session_ap` entries (see Ticket 203 for caps).
* Keep session files as the **single source** for attendance, downtime, and optional absence allocations.
* Provide subcommands:

  * `weave ap apply | status | allocate`.
* Idempotency via file hash + key tuple; re-applies produce no dupes.

## Open Questions / Decisions Needed

* None (decisions captured in related tickets).

## Migration Notes (if any)

* One-time backfill (Ticket 204) to import historical sessions; after that, `weave ap apply` handles new sessions.

## Acceptance Criteria / Tests

* Applying a session with numeric AP writes exactly one `session_ap` per (PC,pillar).
* Applying twice is a no-op (dedupe).
* `status` shows per-PC pillar totals and any sessions with `'-'` still unresolved.
* `allocate` spends credits and enforces tier rules (see Ticket 203).

## Links

* Spec/PR: (to be added)
* Related conversations: This thread
* Commits: (to be added)

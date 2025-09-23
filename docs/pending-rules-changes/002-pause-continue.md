# Pause / Continue Event Semantics

**ID:** 002  
**Status:** Proposed  
**Owner:** —  
**Date Opened:** 2025-09-23  
**Source:** events.md; design notes  
**Affects:** docs/dev/events.md; Hexcrawl Rules §Session Flow

---

## Summary of Software Behavior
Introduce `session_pause` and `session_continue`. `session_continue` carries current hex, party, and in-world date to prevent context leakage when resuming.

## Current Rules Text (canonical)
> Session flow covers `session_start` and `session_end` only.

## Proposed Rules Update
- Add event definitions for `session_pause` and `session_continue` to the Event Reference.
- Add a rules note explaining resume behavior and required payload fields.

## Open Questions / Decisions Needed
- Should `session_pause` also record current hex / party / date for redundancy?

## Acceptance Criteria / Tests
- Resuming after a pause works without needing earlier log context.

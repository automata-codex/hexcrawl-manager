# Partition Boundaries Include `session_pause`

**ID:** 001  
**Status:** Proposed  
**Owner:** —  
**Date Opened:** 2025-09-23  
**Source:** finalize spec; design notes  
**Affects:** docs/dev/session-lifecycle.md §Finalize Behavior & Partition Semantics; Hexcrawl Rules §Session Flow

---

## Summary of Software Behavior
Planned: `finalize` may treat `session_pause` (and/or future `session_split`) as valid **partition boundaries**, not just `session_end`, so multiple parts of the same session can be stitched for reporting.

## Current Rules Text (canonical)
> Partitions end at `session_end`.

## Proposed Rules Update
- Extend partition semantics to end on `session_pause` as well as `session_end`.
- Document how `weave` joins parts for reporting.

## Open Questions / Decisions Needed
- Do we also introduce an explicit `session_split` event?

## Acceptance Criteria / Tests
- A session paused mid-season yields two parts that `weave` reports as the same session.

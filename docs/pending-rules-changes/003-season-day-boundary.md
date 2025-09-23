# Season / Day Boundary Is Documented-Only

**ID:** 003  
**Status:** Approved  
**Owner:** —  
**Date Opened:** 2025-09-23  
**Source:** lifecycle doc  
**Affects:** Hexcrawl Rules §Day/Season Boundaries; docs/dev/session-lifecycle.md §Edge Cases

---

## Summary of Software Behavior
Crossing midnight into a new **day** and **season** during a single session is an intentionally unhandled bookkeeping edge case. The system documents it; no automation is performed.

## Current Rules Text (canonical)
> Implicit dawn-based day start; no explicit cross-midnight handling.

## Proposed Rules Update
- Add explicit rule stating this is a documented-only edge case and not automated.

## Acceptance Criteria / Tests
- Rules explicitly tell GMs to document the boundary and proceed; tools do not enforce it.

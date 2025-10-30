# Archived: Pending Rules Changes (2025-10-30)

This directory contains the original `docs/pending-rules-changes/` system that was designed to track rules changes separately from implementation.

## Why Archived

The tracking system became outdated because:

1. **Implementation diverged from design** - Most documented changes (particularly the AP ledger migration system in tickets 001-005) never happened as planned
2. **Manual workarounds made specs obsolete** - For example, we manually input old session logs instead of building the automated migration system
3. **Better tools available** - Claude Code makes it easier to keep rules and code in sync atomically, reducing the need for separate tracking
4. **Maintenance burden** - The system wasn't being actively maintained, making it more confusing than helpful

## What Was Here

The system tracked 5 major pending changes:
- **001**: Trail longevity and permanence rules
- **002**: AP ledger canonicalization and `weave` processing
- **003**: Absence credits and tier-based allocation rules
- **004**: Session schema additions for downtime and allocations
- **005**: Grandfathering early AP awards (sessions 1-19)

## Historical Value

While the implementation specs are obsolete, these documents contain valuable **design thinking**:
- Decision rationale for tier caps
- Discussion of grandfathering windows (≤ session 19)
- Absence credit mechanics design
- Event-level gating philosophy

These may be useful reference when revisiting related systems.

## Going Forward

Rules changes are now handled by:
1. Updating rules atomically with code changes when possible
2. Using `RULES_DRIFT.md` in the repo root for quick notes when atomic updates aren't feasible
3. Weekly review during release cadence

---

**Archived:** 2025-10-30
**Original location:** `docs/pending-rules-changes/`

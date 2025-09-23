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

|  ID | Title                                                  | Affects (Doc §)                             | Source (Spec/PR)            | Status   | Owner | Link                                  |
|----:|--------------------------------------------------------|---------------------------------------------|-----------------------------|----------|-------|---------------------------------------|
| 001 | Partition boundaries include `session_pause`           | Hexcrawl Rules §Time/Session; Dev: Finalize | finalize spec; design notes | Proposed | —     | ./changes/001-partition-boundaries.md |
| 002 | Pause/Continue event semantics                         | Dev: Events; Hexcrawl Rules §Session Flow   | events.md; design notes     | Proposed | —     | ./changes/002-pause-continue.md       |
| 003 | Season/day rollover is documented-only (no automation) | Hexcrawl Rules §Day/Season Boundaries       | lifecycle doc               | Approved | —     | ./changes/003-season-day-boundary.md  |

> Add rows at the end. Keep IDs zero-padded (e.g., 004, 005).

## How to Use

1. Copy `pending-change-template.md` into `docs/rules-sync/changes/` as `NNN-your-title.md`.
2. Add a row to the table above.
3. When the rewrite is merged, update **Status = Implemented** and add the commit link.

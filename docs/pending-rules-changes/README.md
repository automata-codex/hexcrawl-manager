# Rules Sync

The **rules-sync** directory is a staging area for capturing **pending changes** to the game rules that arise during software/tool development.
Its purpose is to *separate rapid tool iteration from thoughtful rules writing*, so the rules can be updated later with clarity instead of haste.

## Workflow

1. **Capture the delta**
   - When a tool or spec introduces behavior that diverges from the written rules, copy `pending-change-template.md` into the `changes/` folder.
   - Name it with a numeric prefix for ordering (e.g., `004-new-feature.md`).
   - Fill in: description, affected rules, rationale, and status.

2. **Update the index**
   - Add a row to `pending-rules-changes.md` pointing to the new change file.
   - Track its current status (`Pending`, `In Review`, `Implemented`).

3. **Continue development**
   - Don’t touch the main rules docs yet. Just keep adding changes as you discover them.

4. **Periodic reconciliation**
   - When you’re ready (headspace, campaign rhythm, release milestone), review all pending changes.
   - Update the canonical rules docs under `docs/` (or wherever they live).
   - Mark each reconciled change as **Implemented**, and link to the commit/PR.

## Benefits

- **No rush jobs**: You don’t have to rewrite prose rules in the middle of coding.
- **Audit trail**: Clear history of what changed, when, and why.
- **Team clarity**: Anyone can see which parts of the rules are drifting and what’s still open.

## File Structure

```
rules-sync/
├── pending-rules-changes.md   # Index/table of pending changes
├── pending-change-template.md # Template for new change notes
└── changes/
├── 001-partition-boundaries.md
├── 002-pause-continue.md
├── 003-season-day-boundary.md
└── ... (more as needed)
```

## Conventions

- Keep each change **short and specific**.
- Status values:
  - `Pending` — change captured, not reconciled
  - `In Review` — being discussed or clarified
  - `Implemented` — rules updated, with link to commit
- Use numeric prefixes (`001`, `002`, …) so changes sort in chronological order.

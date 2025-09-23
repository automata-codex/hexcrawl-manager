# Session & Rollover Dev Notes

This document summarizes the core conventions for handling session logs, rollovers, and the weave process. It’s intended as a quick reference for contributors.

## Filename Policy

- **Production sessions**
  `session_<SEQ>_<YYYY-MM-DD>.jsonl`
  Example: `session_0012_2025-09-15.jsonl`
  *`<SEQ>` is a zero-padded integer managed via `meta.nextSessionSeq`.*

- **Dev sessions**
  `dev_<ISO>.jsonl` in `sessions/_dev/`
  Example: `dev_2025-09-15T14-33-21.jsonl`
  *Never touches `meta.nextSessionSeq`.*

- **Rollovers**
  `rollover_<seasonId>_<YYYY-MM-DD>.jsonl` in `sessions/rollovers/`
  Example: `rollover_1511-autumn_2025-09-30.jsonl`

- **Footprints**
  Written by `weave apply` under `data/session-logs/footprints/`
  Example: `2025-09-15T21-15-03Z__S-2025-09-15-023a.yaml`

## Namespaces

- **Production**
  Uses sequential IDs, lock files, and updates `meta.nextSessionSeq`.
- **Dev mode** (`--dev` flag or `SKYREACH_DEV=true`)
  Uses ISO timestamps in `_dev/`, no locks, no `meta` updates.

---

## Finalize Behavior

- Takes an in-progress session log.
- Ensures a closing `session_end` event (adds if missing).
- Splits output into **season-homogeneous parts**:
  - Each part is a `sessions/{sessionId}/Sxx[a|b].jsonl` file.
- Inserts a minimal **`season_rollover` event** between parts if a session crosses a season boundary.
- Normalizes season IDs (lowercase) and trail edge keys.
- Reassigns sequence numbers within each part.

## Weave Chronology

`weave apply` enforces **strict chronological order**:

- Rollovers must be applied in sequence.
  Example: You can’t apply `1512-spring` before `1511-winter`.
- Sessions must occur in a season that has already been rolled.
  Example: A session in `1512-spring` requires that the `1512-spring` rollover has been applied.
- Already-applied files are treated as **no-ops** (idempotent).
- Rollovers are **one-way**: once applied, they cannot be undone without repo rollback.

## Summary

- **Start → Finalize → Weave** is the lifecycle.
- Production sessions consume sequential IDs; dev sessions use timestamps.
- Finalize ensures season-clean outputs and synthetic rollovers.
- Weave enforces strict season order and records everything in footprints.

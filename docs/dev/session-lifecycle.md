# Session Lifecycle & Conventions

This document summarizes the core conventions for handling session logs, rollovers, and the weave process. It serves as a reference for contributors and developers.

## Filename Policy

- **Production sessions**
  Format: `session_<SEQ>_<YYYY-MM-DD>.jsonl`
  Example: `session_0012_2025-09-15.jsonl`
  *`<SEQ>` is a zero-padded integer managed via `meta.nextSessionSeq`.*

- **Dev sessions**
  Format: `dev_<ISO>.jsonl`
  Location: `sessions/_dev/`
  Example: `dev_2025-09-15T14-33-21.jsonl`
  *Never touches `meta.nextSessionSeq`.*

- **Rollovers**
  Format: `rollover_<seasonId>_<YYYY-MM-DD>.jsonl`
  Location: `sessions/rollovers/`
  Example: `rollover_1511-autumn_2025-09-30.jsonl`

- **Footprints**
  Written by `weave apply` under `data/session-logs/footprints/`
  Example: `2025-09-15T21-15-03Z__S-2025-09-15-023a.yaml`

## Namespaces

- **Production**
  Uses sequential IDs, lock files, and updates `meta.nextSessionSeq`.

- **Dev mode**
  Triggered by `--dev` flag or `SKYREACH_DEV=true`.
  Uses ISO timestamps in `_dev/`.
  No locks, no `meta` updates.

## Finalize Behavior

The `scribe finalize` command:

- Takes an in-progress session log.
- Ensures a closing `session_end` event (adds if missing).
- Splits output into **season-homogeneous parts**:
  - Each part is written to `sessions/{sessionId}/Sxx[a|b].jsonl`.
- Inserts a minimal **`season_rollover` event** between parts if a session crosses a season boundary.
- Normalizes season IDs (lowercase) and trail edge keys.
- Reassigns sequence numbers within each part.

### Partition Semantics

- By default, partitions end at `session_end`.
- In future, partitions may also end at `session_pause` (or a possible `session_split`) so that `weave` can join multiple parts of the same session for reporting.

## Weave Chronology

The `weave apply` command enforces **strict chronological order**:

- Rollovers must be applied in sequence.
  *Example: `1511-winter` must be applied before `1512-spring`.*

- Sessions must occur in a season that has already been rolled.
  *Example: A session in `1512-spring` requires that the `1512-spring` rollover has been applied.*

- Already-applied files are treated as **no-ops** (idempotent).

- Rollovers are **one-way**: once applied, they cannot be undone without repo rollback.

## Edge Cases & Open Design Notes

- **Season/day boundaries**
  Rules implicitly assume that a “day” starts at dawn, since daylight hours drive labor.
  Adventuring past midnight into a new *day* and *season* is considered an intentionally unhandled edge case. Document, don’t handle.

- **Pause/continue semantics**
  - `session_pause`: payload mirrors `session_start` but with `"status":"paused"` and the same session id.
  - `session_continue`: restores `"status":"in-progress"`. Should also carry current hex, party, and in-world date so that partitioned logs can be resumed without context leakage.

## Lifecycle Summary

- **Start → Finalize → Weave** is the lifecycle.
- Production sessions consume sequential IDs; dev sessions use timestamps.
- Finalize ensures season-clean outputs and synthetic rollovers.
- Weave enforces strict season order and records everything in footprints.
- Edge cases (like crossing midnight into a new season) are documented but not automated.

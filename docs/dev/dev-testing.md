# Developer Guide: Dev Mode & Manual Testing

This guide explains how to use **`scribe` dev mode** and how to safely test the **`weave`** pipeline without risking production data.

> TL;DR: *Use* `scribe --dev` *to draft; copy what you want to test into production dirs; run* `weave apply`; *rollback with Git if needed.*

---

## Dev Mode in `scribe`

- When running `scribe` with dev mode (either `--dev` or `SKYREACH_DEV=true`), all logs are written under:
  ```
  data/session-logs/_dev/
  ```
- Dev files are timestamped and **never** consume production sequence numbers:
  ```
  dev_2025-09-17T15-30-00.jsonl
  ```
- Use dev mode to draft, experiment, and debug **without touching** production state.

### Commands
```sh
# Start a dev session
scribe start --dev

# Finalize the in-progress dev log (writes season-homogeneous parts if needed)
scribe finalize --dev
```

---

## `weave` and Dev Mode (Important)

- `weave` **does not** have a dev mode. It **always** reads/writes **production** state
  (`data/meta.yaml`, `data/trails.yaml`, etc.).
- `weave` only processes files from production locations:
  - Sessions: `data/session-logs/sessions/`
  - Rollovers: `data/session-logs/rollovers/`
- Files in `data/session-logs/_dev/` are **ignored** by `weave` unless you manually copy/move them into the production directories and name them correctly.

---

## Safe Manual Testing Workflow

1. **Snapshot your current state**
   ```sh
   git add .
   git commit -m "Save state before weave dev test"
   ```

2. **Draft sessions in dev**
   ```sh
   scribe start --dev
   # ... emit events ...
   scribe finalize --dev
   ```

3. **Promote a dev file for weave**
   - Copy a dev file into the production sessions directory **with a production-style name**.
   - Use a throwaway high sequence (e.g., `9999`) if you’re *manually* testing and not using the allocator.
   ```sh
   cp data/session-logs/_dev/dev_2025-09-17T15-30-00.jsonl       data/session-logs/sessions/session_9999_2025-09-17.jsonl
   ```
   > If you’re testing a **rollover**, place it under:
   > `data/session-logs/rollovers/rollover_<seasonId>_<YYYY-MM-DD>.jsonl`

4. **Run weave**
   ```sh
   weave apply data/session-logs/sessions/session_9999_2025-09-17.jsonl
   # or
   weave apply data/session-logs/rollovers/rollover_1511-autumn_2025-09-30.jsonl
   ```

5. **Inspect results**
   - `data/trails.yaml`
   - `data/meta.yaml`
   - `data/session-logs/footprints/` (audit trail; file names are timestamped)

6. **Rollback if needed**
   ```sh
   git reset --hard HEAD
   ```

---

## Quick Checklist

- [ ] Drafted in `_dev/` using `scribe --dev`
- [ ] Committed a safety snapshot in Git
- [ ] Copied the test file into **production** dir with **correct** filename
- [ ] Ran `weave apply` on the **production-path** file
- [ ] Verified footprints + state changes
- [ ] Rolled back with Git if results weren’t desired

---

## Notes & Gotchas

- **Do not run `weave` on `_dev/` files.** It won’t see them.
- **`weave` is real.** There is no sandboxed dev state; it mutates production state files.
- **Chronology matters.** `weave` enforces season order and idempotency; apply rollovers before sessions for a season.
- **Footprints are your audit log.** Every `weave apply` writes a footprint file for traceability.
- **Filename policy matters.** Production sessions: `session_<SEQ>_<YYYY-MM-DD>.jsonl`. Rollovers: `rollover_<seasonId>_<YYYY-MM-DD>.jsonl`.

---

## See Also

- `docs/dev/session-lifecycle.md` — lifecycle, filename policy, finalize behavior, chronology rules, and edge cases.
- `docs/dev/events.md` — canonical event kinds and payload schemas emitted by `scribe`.

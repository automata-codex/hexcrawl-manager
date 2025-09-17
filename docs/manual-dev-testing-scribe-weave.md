# Manual Dev Testing: Scribe & Weave

## Overview

This document explains how to use dev mode for `scribe` and how to safely test the `weave` pipeline in a development environment.

## Dev Mode in `scribe`

- When running `scribe` commands with dev mode enabled (e.g., `scribe start --dev`), all session logs and rollovers are written to the `data/session-logs/_dev/` directory instead of the production directories.
- Dev mode is useful for drafting, experimenting, or debugging session logs without affecting production data or state.
- Dev session files are named with a `dev_` prefix and timestamp, e.g., `dev_2025-09-17T15-30-00.jsonl`.

## `weave` and Dev Mode

- The `weave` command **does not have a dev mode**. It always reads and writes production state files (`data/trails.yaml`, `data/meta.yaml`, etc.).
- `weave` only processes session and rollover files from the production directories (`data/session-logs/sessions/` and `data/session-logs/rollovers/`).
- Files in `data/session-logs/_dev/` are **ignored** by `weave` unless you manually copy or move them to the production directories.

## Safe Manual Testing Workflow

1. **Commit your current state**
   - Before testing, commit all changes to Git:
     ```sh
     git add .
     git commit -m "Save state before weave dev test"
     ```
2. **Draft sessions in dev mode**
   - Use `scribe` in dev mode to create and finalize session logs:
     ```sh
     scribe start --dev
     scribe finalize --dev
     ```
   - This keeps your test sessions separate from production data.
3. **Move/copy test files for `weave`**
   - When ready to test with `weave`, copy a dev session file to the production sessions directory:
     ```sh
     cp data/session-logs/_dev/dev_2025-09-17T15-30-00.jsonl data/session-logs/sessions/session_9999_2025-09-17.jsonl
     ```
   - (Rename as needed to match the expected filename format.)
4. **Run `weave`**
   - Apply the session or rollover file:
     ```sh
     weave apply data/session-logs/sessions/session_9999_2025-09-17.jsonl
     ```
   - Inspect the results in `data/trails.yaml`, `data/meta.yaml`, and `data/session-logs/footprints/`.
5. **Rollback if needed**
   - If you want to undo changes, use Git to restore your previous state:
     ```sh
     git reset --hard HEAD
     ```

## Notes

- Never run `weave` on dev files directly; always copy them to the production directory first.
- Always use Git to safeguard your production data during testing.
- There is no sandboxed or isolated dev state for `weave`—all changes are real and persistent.

## Summary

- Use `scribe` dev mode for safe drafting and experimentation.
- Use Git to manage and rollback state when testing `weave`.
- Only production session/rollover files are processed by `weave`.


# `scribe rollover` — Spec (v1.1)

## Purpose

Create a standalone JSONL artifact representing a **season change** that occurs **outside of any session**. The artifact is later consumed by `weave apply trails` to mutate trail state and produce a footprint (including d6 outcomes).

## Preconditions

- **No active session** may be in progress. If a session lock/in-progress buffer exists, the command **fails**.
  - Check: `data/session-logs/.locks/` is empty **and** no open in-progress buffer (implementation-specific).

- Target `seasonId` must be valid (case-insensitive) and stored **normalized** (lower-case `YYYY-season`).

## Synopsis

```bash
scribe rollover <seasonId>
[--dev]                                              # write into dev namespace
```

## Behavior

1. **Validate no active session**

   If any session lock exists (e.g., `data/session-logs/.locks/session-*.lock`) or an in-progress session buffer is detected → **exit with error** (see Exit Codes).

2. **Resolve season(s)**

  - `seasonId` comparisons are case-insensitive; normalize to lower-case (e.g., `1511-autumn`).
  - (Optional future) `--from/--to` could generate a sequence of season IDs from A → B; out of scope for this version.

3. **Output location & naming**

  - **Prod (default)**: `data/session-logs/rollovers/rollover_<seasonId>.jsonl`
    Example: `data/session-logs/rollovers/rollover_1511-autumn.jsonl`
  - **Dev (`--dev`)**: `data/session-logs/_dev/rollovers/dev_rollover_<seasonId>_<UTC-ISO-DATETIME>.jsonl`

   Notes:
  - No date suffix in **prod** filenames (single canonical file per season).
  - Writing is **atomic** (temp + rename). If the prod file already exists for that season, **leave it as-is** (idempotent).

4. **File contents (standard ScribeEvent)**

  - One JSONL record using the standard ScribeEvent envelope:

    ```json
    { "kind": "season_rollover", "payload": { "seasonId": "1511-autumn" } }
    ```

  - Optional header record (for provenance only; not required):

    ```json
    { "kind": "header", "payload": { "id": "ROLL-1511-autumn", "createdAt": "2025-09-15T21:30:00Z" } }
    ```

  - Do **not** include d6 outcomes or per-edge effects; `weave apply` computes and stores those in a footprint.

5. **Side effects**

  - **None.** Do **not** modify `data/meta.yaml` (no counters or applied lists). Chronology is handled by `weave`.

## Exit Codes (proposed)

- `0` success
- `2` active session detected (locks or in-progress buffer present)
- `4` validation error (bad season ID)
- `6` filesystem/write error

## Examples

- Single rollover (prod):

  ```bash
  scribe rollover 1511-Autumn
  # -> data/session-logs/rollovers/rollover_1511-autumn.jsonl
  ```

- Dev rollover (no counters touched):

  ```bash
  scribe rollover 1511-Winter --dev
  # -> data/session-logs/_dev/rollovers/dev_rollover_1511-winter_2025-09-15T21-37-22Z.jsonl
  ```

## Guardrails & Notes

- **Active-session check is mandatory.** This command is strictly **out-of-session**.
- **Season normalization:** store lower-case (`1511-autumn`). Compare case-insensitively everywhere.
- **Namespace isolation:** Dev outputs are ignored by default tooling unless explicitly included.
- **Chronology is enforced by `weave`.** Applying a post-season session before its required rollover will fail at `weave plan/apply` or `weave apply` with a clear message.

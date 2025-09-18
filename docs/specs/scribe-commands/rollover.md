# `scribe rollover` — Spec (v1)

## Purpose

Create a standalone JSONL artifact that represents a **season change** outside of any session, without consuming a session sequence number. `weave` will later apply this file to mutate trail state and write the detailed footprint (including actual d6 results).

## Preconditions

* **No active session** may be in progress. If a session lock/in-progress file exists, the command must **fail**.
  * Check: `sessions/.locks/` empty **and** no open in-progress buffer (implementation-specific).
* Target season ID must be valid and normalized (case-insensitive); store lower-case internally.

## Synopsis

```
scribe rollover <seasonId>
[--dev]                                              # write into dev namespace
```

## Behavior

1. **Validate no active session**

  * If any session lock exists (e.g., `sessions/.locks/session_*.lock`) or an in-progress session buffer is detected → **exit with error** (see Exit Codes).

2. **Resolve season(s)**

  * `seasonId` comparisons are **case-insensitive**; normalize to lower-case (e.g., `1511-autumn`).
  * If `--from/--to` provided, generate a **sequence** of season IDs from A → B (exclusive of A, inclusive of B). Do not infer calendar rules; assume `from`/`to` are already valid adjacent steps according to your calendar system.

3. **Output location & naming**

  * **Prod (default)**: `sessions/rollovers/rollover_<seasonId>_<UTC-ISO-DATE>.jsonl`
    * Example: `sessions/rollovers/rollover_1511-autumn_2025-09-15.jsonl`
  * **Dev (`--dev`)**: `sessions/_dev/rollovers/dev_rollover_<seasonId>_<UTC-ISO-DATETIME>.jsonl`
  * Does **not** touch `meta.nextSessionSeq`.

4. **File contents (minimal)**

  * One JSONL record:

    ```json
    { "kind": "season_rollover", "seasonId": "1511-autumn" }
    ```
  * Optionally prepend a header record for provenance (nice to have, not required):

    ```json
    { "kind": "header", "id": "ROLL-1511-autumn", "createdAt": "2025-09-15T21:30:00Z" }
    ```
  * **Do not** include d6 outcomes or per-edge effects; `weave apply` will compute/store those in a footprint.

5. **Atomic write**

  * Write to a temp file then rename to the final path to avoid partial files.

6. **No side effects**

  * Do not modify `data/meta.yaml` (no counters, no applied lists). Integration with chronology is handled by `weave`.

## Exit Codes (proposed)

* `0` success
* `2` active session detected (locks or in-progress buffer present)
* `4` validation error (bad season ID, invalid range for `--from/--to`)
* `6` filesystem/write error

## Examples

* Single rollover (prod):

  ```
  scribe rollover 1511-Autumn
  -> sessions/rollovers/rollover_1511-autumn_2025-09-15.jsonl
  ```
* Dev rollover (no counters touched):

  ```
  scribe rollover 1511-Winter --dev
  -> sessions/_dev/rollovers/dev_rollover_1511-winter_2025-09-15T21-37-22Z.jsonl
  ```
* Multiple rollovers (caught up after a hiatus):

  ```
  scribe rollover --from 1511-Autumn --to 1512-Spring
  -> rollover_1511-winter_...jsonl
  -> rollover_1512-spring_...jsonl
  ```

## Guardrails & Notes

* **Active-session check is mandatory.** If you routinely need mid-session boundaries, use `finalize` auto-split or pause the session—`scribe rollover` is strictly **out-of-session**.
* **Season normalization:** store lower-case (`1511-autumn`). Compare case-insensitively everywhere.
* **Namespace isolation:** `--dev` outputs are ignored by default tooling unless explicitly included (same convention as dev sessions).
* **Chronology is enforced by `weave`.** Applying a post-season session before its required rollover will fail at `weave plan/apply` with a clear message.

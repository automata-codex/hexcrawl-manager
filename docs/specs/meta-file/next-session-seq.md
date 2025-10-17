# `meta.nextSessionSeq` — Semantics (v1.0)

## Purpose

`meta.nextSessionSeq` is a **suggestion cursor** for the next production session number used by `scribe`.
It aids UX and lock reservation, but it is **not** the authoritative ordering source. Authoritative ordering comes from the **session stem** in finalized files: `session_<SEQ>_<YYYY-MM-DD>`.

## Invariants

- Value is a **1-based integer** (`>= 1`).
- **Dev mode is excluded** — dev sessions do not read or write this value.
- The canonical order of sessions is determined by the `<SEQ>` parsed from finalized stems; `nextSessionSeq` should **track** but does not define that order.

## Who reads/writes it

- **`scribe start` (normal)** — **reads** to propose `<SEQ>`; does **not** write.
- **`scribe start interactive`** — **reads** defaults; does **not** write.
- **`scribe finalize` (prod)** — **writes** on success:
  - After writing ≥1 finalized outputs for stem `session_<SEQ>_...`, set
    `meta.nextSessionSeq = max(all finalized SEQs) + 1`
  - If a lock exists and its `seq` is higher, heal forward to `lock.seq + 1`.
- **`weave`** — **never writes**; may read for status/reporting only.
- **`scribe abort`** — **never writes**; deletes in-progress + lock but leaves meta unchanged.
- **`scribe doctor`** — may **read** and **report** gaps/mismatches; does **not** write.

## Normal flow (happy path)

1. `meta.nextSessionSeq = N`
2. `scribe start P13` reserves lock for `N`, creates `session_N_YYYY-MM-DD.jsonl` in-progress.
3. `scribe finalize` produces `session_N_YYYY-MM-DD.jsonl` (and possible suffix parts).
4. `finalize` sets `nextSessionSeq = N + 1` and removes the lock.

## Out-of-order & backfill flows

- You may finalize sessions **out of sequence** (e.g., finalize `session_0012` after `session_0042`).
  On success, `finalize` recomputes:
  - `nextSessionSeq = max(finalized SEQs) + 1`
    This ensures the next suggested number always follows the highest finalized session.

- **Gaps are allowed**:
  - Example: finalized SEQs = `{1, 2, 5}` → `nextSessionSeq = 6`.
    Gaps (3–4) are reported by `scribe doctor`; no automatic backfill is performed.

- **Duplicates are not allowed** (guarded elsewhere):
  - Two finalized files with the same `<SEQ>` must be prevented by your finalize pipeline and/or flagged by `weave`.

## Lock interaction

- A production `start` creates `.locks/session_<SEQ>.lock` with the reserved number.
- If `finalize` completes successfully and the highest finalized `<SEQ>` is **behind** the lock’s `seq`, set
  `nextSessionSeq = lock.seq + 1` (heals forward in the rare case of concurrent or resumed finalize work).
- If no outputs were written (e.g., validation failure), **do not** change `nextSessionSeq`.

## Date consistency (related constraint)

- `session_start.sessionDate` must match the stem `<YYYY-MM-DD>`.
  `finalize` should verify this **before** mutating `meta`.

## Dev mode

- Dev sessions (`_dev/dev_<ISO>.jsonl`) do not use sequence numbers and must **not** change `nextSessionSeq`.

## Recovery & manual edits (operational guidance)

- If `nextSessionSeq` is **behind** the highest finalized `<SEQ>`, run `scribe doctor` and a successful `finalize` of any pending session; `finalize` will move it to `max(finalized)+1`.
- If `nextSessionSeq` is accidentally moved **ahead** (no finalized stems exist at or above it), it’s harmless; the next `start` will reserve that number. You may **manually** edit `meta.yaml` to restore the previous suggestion if desired.
- Never hand-edit `meta.nextSessionSeq` to “fill a gap.” Gaps are harmless and reported; correctness depends on stems, not this cursor.

## Examples

- **All caught up**
  - Finalized: `1..7` → `nextSessionSeq = 8`

- **Backfill done late**
  - Finalized: `{1..5, 9}` then finalize `6` and `7` later → `nextSessionSeq` progresses:
    - after `9`: `10`
    - after `6`: still `10`
    - after `7`: still `10`

- **Lock higher than finalized**
  - Lock for `12` exists; only `1..10` finalized. On finalizing `12`, set `nextSessionSeq = 13`.

## FAQ

- **Q:** Is `nextSessionSeq` authoritative?
  **A:** No. It’s a convenience pointer. Ordering is enforced by finalized stems and `weave`.

- **Q:** Can `start interactive` move it?
  **A:** No. Only `finalize` moves it, after successful output.

- **Q:** What about multi-part files (`a`, `b`, …)?
  **A:** They inherit the same base `<SEQ>`. They do **not** affect `nextSessionSeq` independently.

---

**TL;DR:** Treat `meta.nextSessionSeq` as a *suggestion* maintained by `finalize`: always `max(finalized) + 1`. It never blocks backfills or defines apply order; stems do.

# `weave session` — Command Spec

> **File:** `docs/specs/weave-commands/session.md`
>
> **Scope:** Bootstrap the **next planned** session report using `data/meta.yaml: nextSessionSeq`.
>
> **Important:** This command **does not modify** `data/meta.yaml`; it only reads the value.
>
> **Related:** AP Workflow Overview (`docs/specs/ap-workflow-overview.md`), Data Contracts (`docs/specs/data-contracts.md`), schemas in `/schemas`.

---

## 1) Purpose

* Create a **planned** session report stub for the sequence number indicated by `meta.nextSessionSeq` (`session-####`).
* Never writes AP, attendance, or `scribeIds[]`.
* **Does not** bump or write back to `data/meta.yaml`.

**Non-goals:** completing sessions, parsing logs, writing ledger entries, or touching existing completed reports.

---

## 2) Invocation

```bash
# Create the planned report for meta.nextSessionSeq (read-only meta)
weave session

# Provide metadata at creation
weave session --agenda "Into the salt caves" --notes "Prep: lair map" --game-start-date "1057-Highsun-12"

# Overwrite an existing planned file for that ID (never completed)
weave session --force
```

**Flags (all optional):**

* `--agenda <string>`
* `--notes <string>`
* `--game-start-date <YYYY[-MM[-DD]]>` (in-world date string as used in your setting)
* `--force` (allow overwriting an existing **planned** file for that ID)

---

## 3) Inputs & Writes

**Reads**

* `data/meta.yaml` → `nextSessionSeq` (integer; the 4-digit value to use)
* Existing `data/session-reports/session-####.yaml` (to detect collisions)

**Writes**

* New/updated: `data/session-reports/session-####.yaml` (with `status: "planned"`)

> There is **no** write to `data/meta.yaml`.

---

## 4) Preconditions & Guards

* **Clean working tree recommended** (to avoid half-staged stubs). Policy:

  * If working tree is **dirty** (`git status --porcelain` non-empty) and `--force` **not** provided → **fail** with guidance to commit/stash or rerun with `--force`.
  * With `--force`, proceed even if dirty.
* **Collision handling**

  * If `data/session-reports/session-####.yaml` **does not exist** → OK to create.
  * If it **exists** with `status: "planned"` → require `--force` to overwrite.
  * If it **exists** with `status: "completed"` → **fail** (never overwrite a completed report), even with `--force`.
* **Sequence usage**

  * Uses `meta.nextSessionSeq` verbatim; the command does **not** adjust or bump it. If `nextSessionSeq` points at an already-completed ID, the command will fail (see collision handling). Operator can update `meta.yaml` out-of-band if desired.

---

## 5) Behavior (deterministic)

1. Read `data/meta.yaml: nextSessionSeq` → compute `id = "session-" + zeroPad(nextSessionSeq, 4)`.
2. Run **guards** (dirty-git policy; collision rules).
3. Compose the **planned** report:

   ```yaml
   id: "session-####"
   status: "planned"
   agenda: "<from --agenda, optional>"
   notes: "<from --notes, optional>"
   gameStartDate: "<from --game-start-date, optional>"
   ```

  * Do **not** include: `scribeIds`, `attendance`, AP/pillars, `absenceAllocations`.
  * Do **not** set `sessionDate` (real-world date is derived later from logs by `ap apply`).
4. Write `data/session-reports/session-####.yaml` (overwrite only if allowed by guards).

---

## 6) Idempotency & Overwrites

* **Idempotent when file absent**: creates a new planned stub for that ID.
* **Not idempotent when file present**: re-running without `--force` refuses to overwrite a planned stub; with `--force`, it overwrites.
* **Completed reports are immutable**: never overwritten by this command.

---

## 7) Output (human-readable)

On success, print a one-liner and the path:

```
Created planned report: data/session-reports/session-0024.yaml
```

If `--force` overwrote a planned file, add:

```
(Overwrote existing planned report for session-0024)
```

---

## 8) Errors & Exit Behavior

* Dirty git without `--force` → non-zero with hint: `git add -A && git commit -m "..."` or `git stash -u`, or rerun with `--force`.
* Collision with **completed** report → non-zero explaining immutability.
* I/O or schema validation errors → non-zero with file path and reason.
* Success → exit 0.

---

## 9) Examples

```bash
# Typical flow (clean repo)
weave session         # creates session-0024 planned using meta.nextSessionSeq

# Provide metadata
weave session --agenda "Salt caves" --notes "Bring spare torches" --game-start-date "1057-HS-12"

# Overwrite an existing planned file (never completed)
weave session --force
```

---

## 10) Test Cases (see `docs/dev/ap-test-matrix.md`)

* Clean repo, no collision → creates file.
* Dirty repo, no `--force` → fails with guidance.
* Existing **planned** report for the target ID:

  * Without `--force` → fails.
  * With `--force` → overwrites.
* Existing **completed** report for the target ID:

  * With/without `--force` → fails (immutable).
* Flags round-trip: values appear in YAML exactly; omitted fields absent.

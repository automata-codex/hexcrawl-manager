# `session` — Command Spec

> **File:** `docs/specs/session.md`
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
session

# Overwrite an existing file for that ID
session --force
```

**Flags:**

* `--force` (allow overwriting an existing file for that ID)

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

* If `data/session-reports/session-####.yaml` **exists** and `--force` is **not** provided, the command fails and prints an error.
* If `--force` is provided, the file is overwritten regardless of its contents or status.
* There is **no** check for git working tree status.
* There is **no** check for completed vs planned status in the existing file.

---

## 5) Behavior

1. Read `data/meta.yaml: nextSessionSeq` → compute `id = "session-" + zeroPad(nextSessionSeq, 4)`.
2. If the output file exists and `--force` is not set, fail.
3. Compose the **planned** report with the following fields:

   ```yaml
   id: "session-####"
   status: "planned"
   scribeIds: []
   sessionDate: ""
   gameStartDate: ""
   agenda: []
   downtime: []
   absenceAllocations: []
   schemaVersion: 2
   source: "scribe"
   createdAt: "<ISO timestamp>"
   ```

4. Validate the object against the schema.
5. Write `data/session-reports/session-####.yaml` (overwrite only if allowed by guards).

---

## 6) Idempotency & Overwrites

* **Idempotent when file absent**: creates a new planned stub for that ID.
* **Not idempotent when file present**: re-running without `--force` refuses to overwrite; with `--force`, it overwrites regardless of file contents.

---

## 7) Output

On success, print a one-liner and the path:

```
✅ Created planned session report: data/session-reports/session-0024.yaml
```

If the file already existed and was overwritten (with `--force`), no additional message is printed.

---

## 8) Errors & Exit Behavior

* Existing file without `--force` → non-zero exit, prints error.
* I/O or schema validation errors → non-zero with file path and reason.
* Success → exit 0.

---

## 9) Examples

```bash
# Typical flow
session         # creates session-0024 planned using meta.nextSessionSeq

# Overwrite an existing file
session --force
```

---

## 10) Test Cases

* No collision → creates file.
* Existing file for the target ID:
  * Without `--force` → fails.
  * With `--force` → overwrites.
* Flags for agenda, notes, game-start-date are not supported.
* No git dirty check.

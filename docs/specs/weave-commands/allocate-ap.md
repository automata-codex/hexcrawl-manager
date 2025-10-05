# `weave allocate ap` — Command Spec

> **File:** `docs/specs/weave-commands/ap-allocate.md`
>
> **Scope:** Spend **Tier-1 absence credits** for one or more characters, recording a transaction in the ledger and appending an audit row to the **most recent completed** session report’s `absenceAllocations[]`.
>
> **Related:** AP Workflow Overview (`docs/specs/ap-workflow-overview.md`), Data Contracts (`docs/specs/data-contracts.md`), schemas in `/schemas`.

---

## 1) Purpose

* Validate **available absence credits** (derived at runtime; Tier-1 only).
* Spend credits and record:

  * a ledger **`absence_spend`** transaction (with a pillar breakdown), and
  * an audit row in the **latest completed** session report’s `absenceAllocations[]`.

**Non-goals:** producing/altering play AP (`session_ap`), supporting Tier-2+ spends, or emitting machine-readable output.

---

## 2) Invocation

```bash
# Spend N credits for a Tier-1 character, mapping credits to pillars explicitly
weave ap allocate --character <id> --amount 3 --combat 1 --exploration 2 --note "Missed 0021"

# Multiple characters (repeat flags per character)
weave ap allocate \
  --character <id1> --amount 2 --social 2 \
  --character <id2> --amount 1 --exploration 1
```

**Flags (proposed):**

* `--character <id>` (repeatable)
* `--amount <int>` (per character; **1 credit = 1 AP**)
* Pillar targets (per character; **sum must equal amount**):
  `--combat <int>` `--exploration <int>` `--social <int>`
* `--note <string>` (optional, copied to ledger + report)

> If pillar targets are omitted, the command **fails** (be explicit about where credits go).

---

## 3) Inputs (read-only lookups)

* **Ledger** — prior `absence_spend` and all `session_ap`.
* **Completed session reports** — to:

  * identify the **latest completed** `session-####`,
  * read per-session **downtime** when deriving credits,
  * append `absenceAllocations[]` (write).
* **Character files** — to read **level** (derive tier):
  1–4→Tier 1, 5–10→Tier 2, 11–16→Tier 3, 17–20→Tier 4; missing level ⇒ Tier 1.

---

## 4) Preconditions & Hard Failures

* **Latest completed session required.** If none exists → **fail**.
* **Clean working tree required** to append to the completed report. If `git status --porcelain` is non-empty → **fail** (ask to commit/stash first).
* **Characters must be Tier-1.** If derived tier > 1 for any target character → **fail** (Tier-2+ do not earn credits; spends not supported).
* **Pillar sum matches amount (Tier-1).** `combat + exploration + social == amount`; else **fail**.
* **Sufficient credits.** If `available < amount` for any character → **fail** (no overdraw).

---

## 5) Credit derivation (deterministic, read-only)

For each target `characterId`:

* `creditsEarned` = count of **completed sessions** where all are true:

  * character **did not attend**,
  * character **not in downtime** (any downtime entry blocks),
  * character’s **current** tier (from level) is **Tier 1**.
* `creditsSpent` = sum of ledger `absence_spend.amount` for that character (full history).
* `available = max(0, creditsEarned - creditsSpent)`.

> Mirrors `weave ap status`. Guests never accrue/spend.

---

## 6) Writes (append-only) & Effects

For **each** character (after validations):

### 6.1 Ledger — append `absence_spend`

Minimum fields (names per schema):

* `kind: "absence_spend"`
* `characterId`
* `amount` (integer credits)
* `sessionIdSpentAt` = **latest completed** `session-####`
* `createdAt` (UTC ISO)
* `note?`
* `pillars: { combat?: number, exploration?: number, social?: number }`
  (matches CLI distribution; **Tier-1 required**)

> No `session_ap` is created or mutated. Pillar progress from credits is modeled via this breakdown (see Status behavior below).

### 6.2 Latest completed report — append to `absenceAllocations[]`

Append a row with at least:

* `characterId`
* `amount`
* `createdAt`
* `note?`
* `pillars` (same breakdown as the ledger entry)

> Append-only. Never write to **planned** reports.

---

## 7) Idempotency & Re-runs

* This command is **not** idempotent by design; repeating it will create another spend.
* Operator guidance: avoid double-executing; review the latest completed report’s `absenceAllocations[]` (git diff) and the ledger if unsure.

---

## 8) Output (human-readable)

Render a simple table:

```
characterId   amount   pillars (c/e/s)   sessionIdSpentAt   available(before→after)   note
istavan       3        1/2/0             session-0023       5→2                       Missed 0021
```

---

## 9) Errors & Exit Behavior

* No completed report to attach to → non-zero.
* Dirty git when updating the report → non-zero with guidance (`git add/commit` or `git stash -u`).
* Character not found / derived tier > 1 / pillar sum mismatch / insufficient credits → non-zero with specific message.
* Success → exit 0.

---

## 10) Examples

```bash
# Tier-1: split across pillars
weave ap allocate --character istavan --amount 3 --combat 1 --exploration 2 --note "Missed 0021"

# Multiple Tier-1 allocations
weave ap allocate \
  --character istavan --amount 2 --exploration 2 \
  --character mira    --amount 1 --social 1
```

---

## 11) Test Cases (see `docs/dev/ap-test-matrix.md`)

* No completed reports → fails.
* Dirty git → fails with guidance.
* Tier-1 with pillar split; verifies `absence_spend` in ledger + report audit row.
* Derived tier > 1 → fails (unsupported).
* Insufficient credits → fails.
* Re-run creates a second spend (non-idempotent by design).

# `weave ap status` — Command Spec

> **File:** `docs/specs/weave-commands/ap-status.md`
>
> **Scope:** Read-only rollup of AP progress and absence credits. Folds the canonical ledger and completed session reports to show per-character pillar totals and **available absence credits** (derived at runtime, not persisted).
>
> **Related:** AP Workflow Overview (`docs/specs/ap-workflow-overview.md`), schemas in `/schemas`.

---

## 1) Purpose

- Aggregate **pillar totals** per character from the AP ledger (`session_ap` plus any other pillar deltas such as `absence_spend` for Tier‑1, `downtime`, or `correction`).
- **Derive absence credits at runtime** (Tier‑1 & **not** in downtime) from completed session reports.
- Show **earned / spent / available** absence credits.
- Provide machine‑readable (`--json`) and human‑readable table output.

Non‑goals: writing reports/ledger, allocating credits, or mutating any files.

---

## 2) Invocation

```bash
# all characters, full history, table output
weave ap status

# filter to one or more characters
weave ap status --character <characterId> [--character <characterId> ...]

# structured JSON for tooling/CI
weave ap status --json
```

**Optional flags (all optional):**
- `--character <id>` (repeatable): limit output to one or more characters.
- `--since <session-####>` / `--until <session-####>`: constrain the session window (affects totals and credit derivation).
- `--json`: emit structured JSON instead of a table.
- `--quiet`: suppress headers/summary; table rows only (ignored with `--json`).

---

## 3) Inputs (read‑only)

- **Ledger** (append‑only; canonical from session‑0001):
  - `session_ap` entries (per (session, character), with pillar `{ delta, reason, note? }`).
  - `absence_spend` entries (credit transactions; may or may not be paired with pillar deltas depending on tier policy).
- **Completed session reports** (`data/session-reports/session-####.yaml`):
  - `attendance.characterIds[]` (who attended).
  - `attendance.guests[]` (ignored for AP/credits).
  - `downtime[]` (shape per schema): **any** entry for a character ⇒ “in downtime” for that session.
- **Character files** (for **level**, from which tier is derived: 1–4→T1, 5–10→T2, 11–16→T3, 17–20→T4; missing level ⇒ T1).

**Ordering:** sessions are unique and ordered by **session number** (`session-####`). Sessions may share the same `sessionDate`.

---

## 4) Computation (deterministic)

### 4.1 Pillar totals

For each selected `characterId`:

1) Gather all **ledger** `session_ap` entries in the window (`--since/--until` if provided).
2) Sum per pillar (`combat`, `exploration`, `social`) across **all reasons** present in those entries.
   - System‑wide reasons: `"normal" | "cap" | "absence_spend" | "downtime" | "correction" | "grandfathered"`.
   - Status **does not** reinterpret reasons or re‑apply event gates; it trusts whatever `ap apply` (and other commands) recorded.
3) If your allocation step writes pillar deltas with `reason: "absence_spend"` for Tier‑1, they are included automatically by step 2.

### 4.2 Absence credits (derived; not persisted)

For each **completed session** in the window, compute whether a credit is **earned** by a given character:

- `attended` := characterId ∈ `attendance.characterIds[]`
- `inDowntime` := session report has **any** `downtime[]` entry for characterId
- `tier` := derived from the character’s **current level** (1–4→T1, 5–10→T2, 11–16→T3, 17–20→T4; missing ⇒ T1)
- **Earn a credit** iff: `tier == 1 && !attended && !inDowntime`

**Start point / eligibility window:**
- If the schema provides an introduction marker (e.g., `introducedAt`, `firstSessionId`), begin counting at that session (inclusive).
- Else, begin at the character’s **first attendance** session (inclusive).
- If the character has **never** attended and has no intro marker → 0 credits by default (to avoid runaway accrual).

**Spends:**
- `creditsSpent` = sum of **ledger** `absence_spend.amount` within the window (regardless of tier).
- `creditsEarned` = count of sessions that met the earn criteria above.
- `creditsAvailable` = `max(0, creditsEarned - creditsSpent)`.

> Guests never factor into AP or credits.

---

## 5) Output

### 5.1 Table (default)

Per‑character row:

| characterId | combat | exploration | social | credits (avail/earned/spent) |
|-------------|--------|-------------|--------|-------------------------------|

- **combat/exploration/social** = summed pillar totals.
- **credits** = `available/earned/spent` (e.g., `3/7/4`).

A summary line may follow, e.g., `N characters; sessions considered: session-0001..session-0023`.

### 5.2 JSON (`--json`)

```json
{
  "window": { "since": "session-0001", "until": "session-0023" },
  "characters": [
    {
      "characterId": "istavan",
      "pillars": { "combat": 5, "exploration": 7, "social": 4 },
      "credits": { "earned": 7, "spent": 4, "available": 3 },
      "notes": []
    }
  ]
}
```

Optionally include a `notes[]` array per character (e.g., “level missing; treated as Tier 1”, “no intro marker; credits start from first attendance”).

---

## 6) Behavior & Constraints

- **Read‑only:** does not write or modify any files.
- **Guests ignored:** `attendance.guests[]` is informational only.
- **Windowing:** all sums and credit derivations respect `--since/--until` if provided; default is full campaign range.
- **Tier policy for credits:** uses **current level → tier** mapping at status time (missing level ⇒ Tier 1).
- **Downtime:** **any** downtime entry for a character in a session blocks credit for that session.

---

## 7) Errors & Exit Behavior

- Missing or unreadable files → non‑zero exit with specific path(s) and reason.
- Schema validation failure → non‑zero with file path and validation error.
- Unknown `characterId` passed in `--character` → non‑zero with list of valid IDs (or skip with a warning; pick one policy and document).
- Success → exit 0.

---

## 8) Examples

```bash
# Full table across all characters and sessions
weave ap status

# Single character
weave ap status --character istavan

# Limited window and JSON output
weave ap status --since session-0015 --until session-0023 --json
```

---

## 9) Test cases (see `docs/dev/ap-test-matrix.md`)

- T1 character absent vs in downtime: earns vs blocks credits correctly.
- T2+ character: earns **no** credits regardless of absence.
- Missing level: treated as Tier 1 for credits.
- Sessions with guests only: no credits produced for any character.
- Windowing (`--since/--until`) changes both pillar sums and credits consistently.
- Character with no intro marker and no attendance: 0 credits.
- Presence of `absence_spend` entries reduces `creditsAvailable` properly.

---

## 10) Notes / Future

- If you later store a per‑session **tier‑at‑time** snapshot, `status` can switch from using current level to “tier at session” for historical credit eligibility.
- Add `--list-sessions-with-credits` to output the specific session IDs contributing to `creditsEarned` for auditability.

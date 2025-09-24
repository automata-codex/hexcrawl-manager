# `session`, `weave ap`, and Session Reports

## Purpose

Unify the session lifecycle with structured YAML reports and a canonical AP ledger.
Provide CLI commands to bootstrap planned sessions, complete them after play, and manage AP awards and absence allocations.

---

## File Layout

```
data/
  session-logs/sessions          # scribe output (unchanged)
    session_0012_2025-09-15.jsonl
  session-reports/               # NEW: session reports (planned + completed)
    session-0012.yaml
  ap-ledger.jsonl                # NEW: canonical AP ledger (append-only)

data/meta.yaml                   # tracks nextSessionSeq
cli/commands/scribe/config/      # ap.json, advancement.json
```

---

## Session Reports

* **Filename:** `session-####.yaml` (4-digit zero-pad)
* **Field `id`:** `"session-####"`
* **Field `status`:** `"planned"` or `"completed"`

### Planned

* `id`, `status: planned`
* `scribeIds: []` (may be empty until logs exist)
* `sessionDate: ""` (manual, left blank by bootstrap)
* `gameStartDate: string` (in-world date, free text)
* `agenda: string[]`
* `downtime: []`
* `absenceAllocations: []`
* *No* `characterIds` or AP fields.

### Completed

* Adds:
  * `sessionDate`: earliest real-world timestamp from referenced scribe logs
  * `gameEndDate`: last in-world date (free text)
  * `characterIds`: list of PCs (from `party_set` events); guests as `{ characterName, playerName }`
  * `advancementPoints`: AP awards by pillar, per logs (0 if missing)
  * `absenceAllocations`: may include spends
* Immutable: once written, treated as read-only (apply is idempotent only).

---

## AP Rules

* **Ledger canonical from session 1.**
* **Grandfathering:** sessions ≤ `session-0019` preserve awards as-is (`reason: "grandfathered"`).
* **Caps:** sessions ≥ `session-0020` clamp over-cap awards (`reason: "cap"`).
* **Absence credits:** derived at runtime (never stored).
  * 1 credit per absent session if not in downtime.
  * Only spendable at Tier 1.
* **Allocate behavior:** writes to ledger *and* the most recent completed report’s `absenceAllocations[]`.

---

## Config

`cli/commands/scribe/config/ap.json`

```json
{
  "grandfather": { "untilSessionId": "session-0019" },
  "absence": { "creditPerMissedSession": 1, "exemptIfDowntime": true },
  "absenceSpend": { "tier1CapOnly": true }
}
```

`cli/commands/scribe/config/advancement.json`
Transcribed from Character Advancement PDF: levels, tiers, AP thresholds.

---

## CLI Commands

### `session`

Bootstrap a new planned session.

**Usage**

```
npm run cli -- session [--force]
```

**Behavior**

* Reads `nextSessionSeq` from `data/meta.yaml`.
* Creates `data/session-reports/session-####.yaml` with `status: planned`.
* Fails if file exists unless `--force`.
* Fields initialized as above.

---

### `weave ap apply`

Generate completed reports + ledger entries from scribe logs.

**Usage**

```
npm run cli -- weave ap apply [--only session-####] [--dry-run]
```

**Behavior**

* Validates report:

  * Fails if status is `completed`.
  * Fails if `scribeIds` empty or any referenced logs missing.
* Attendance from `party_set` events.
* AP from AP events; 0 if missing. Apply grandfather/cap rules.
* Sets `sessionDate`, `gameStartDate`, `gameEndDate`.
* Appends per-character entries to `ap-ledger.jsonl` (skip duplicates).
* Marks report as `completed`, writes `weave.*` metadata.
* Collects all errors, prints summary, exit non-zero if any.

---

### `weave ap allocate`

Spend absence credits.

**Usage**

```
npm run cli -- weave ap allocate --character <id> [combat=N] [exploration=M] [social=K]
```

**Behavior**

* Derives available credits from ledger + sessions.
* Validates request ≤ available credits.
* If tier = 1: apply allocations.
* If tier ≥ 2: record `absence_spend` only, no pillar deltas.
* Appends to `ap-ledger.jsonl`.
* Updates most recent completed session report’s `absenceAllocations[]`.

---

### `weave ap status`

Report AP balances and credits.

**Usage**

```
npm run cli -- weave ap status
```

**Behavior**

* Folds ledger into totals per character.
* Computes derived credits.
* Outputs: pillar totals, tier, credits available.
* Flags any reports still `planned` or with missing AP.

---

You’re right — the spec I gave you doesn’t currently include migration, but we **did** cover it in detail earlier in this thread. Here’s what we had agreed on for migration (pulled together into one place so you can drop it into the spec’s “Migration” section):

---

## Migration (one-time scripts)

### Goals

* Convert all existing session files to the new **session report v2** format.
* Generate a canonical **AP ledger** (`data/ap-ledger.jsonl`) from past sessions.
* Preserve “grandfathered” behavior for sessions ≤ 19.
* Backfill absence allocations as derived.

### Steps

1. **Upgrade existing reports**

  * Input: `data/sessions/` (old YAMLs).
  * Output: `data/session-reports/session-####.yaml` (v2).
  * For each session:

    * Assign new `id` (`session-####`) with zero-padding.
    * Populate `scribeIds[]` by grouping `session_####_YYYY-MM-DD.jsonl` logs.
    * Map old fields (`agenda`, `events`, `advancementPoints`, `characterIds`).
    * Insert `status: completed` (all existing sessions are completed).
    * Add `grandfathered` flag up through session 19.
    * Ensure `downtime: []`, `absenceAllocations: []` are present.

2. **Populate session dates**

  * Set `sessionDate` to earliest real-world timestamp in logs.
  * Set `gameStartDate` to earliest in-world date; `gameEndDate` to latest (if available).
  * If dates missing, leave blank for manual fill.

3. **Backfill absence allocations**

  * Compare `characterIds` (attendees) to full character roster.
  * Each absent PC: +1 unallocated credit, capped at Tier 1.
  * Record in report’s `absenceAllocations: []`.

4. **Generate AP ledger**

  * For each session report:

    * Group AP by character.
    * Write one **session\_ap** entry per (session, character) with all three pillars included:

      * `{ delta, reason }` per pillar.
      * Use `reason: "grandfathered"` for sessions ≤ 19.
      * Use `reason: "cap"` for capped pillars at 20+.
      * If no log entry for a pillar, record `{ delta: 0, reason: "cap" }`.
  * Append entries to `data/ap-ledger.jsonl`.

5. **Manual review**

  * Fill in any gaps where AP totals or in-world dates are ambiguous.
  * Validate ledger totals against character sheets.
  * Mark any discrepancies for correction entries if needed.

---

## Open Issues

* No `--json` output (human readable only).
* Rebuilding completed reports from corrected logs: out of scope; delete and regenerate manually if needed.

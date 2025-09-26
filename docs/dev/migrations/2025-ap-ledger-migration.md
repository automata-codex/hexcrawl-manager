# AP Ledger Migration (one-time)

> **File:** `docs/dev/migrations/2025-AP-ledger-migration.md`
>
> **Scope:** One-time content migration to the new AP system:
>
> 1. Convert legacy `data/sessions/` to **v2 session reports**,
>
> 2. Generate a **canonical AP ledger** from finalized scribe logs (plus legacy reports when logs are missing),
>
> 3. Produce a **reconciliation report** of ledger totals vs current character YAML totals.
>
> **Not a CLI command:** this is a standalone script (run once), separate from the `weave` commands.
>
> **Schemas:** live under `/schemas`. The migration writes artifacts compatible with the current specs.

---

## 1) Goals & non-goals

**Goals**

* Create completed **v2** session reports at `data/session-reports/session-####.yaml` for historical sessions.
* Build a **canonical, append-only** AP ledger from `session-0001` onward, honoring the current rules:

  * Event-level gate: AP events carry `{ number, maxTier }`; a character earns the event iff `tier ≤ maxTier`.
  * **Tier from level**: 1–4→T1, 5–10→T2, 11–16→T3, 17–20→T4 (missing level ⇒ T1).
  * ≤`session-0019`: over-tier events are **included** and marked `grandfathered`.
    ≥`session-0020`: over-tier events are **excluded** and (`if any excluded`) the pillar is marked `cap`.
  * Missing AP for an attending character ⇒ `{ delta: 0, reason: "normal" }`.
* **Do not** backfill absence credits or allocations. (Absence credits are derived at runtime; you will handle any pre-session-19 absentee adjustments manually later.)
* Emit a **reconciliation report** summarizing diffs between ledger totals and current character YAML AP totals.

**Non-goals**

* Changing or reinterpreting your current character YAML totals.
* Implementing a general “apply” workflow (that lives in `weave ap apply`).
* Backfilling `absenceAllocations[]` or inventing downtime history.

---

## 2) Inputs & outputs

**Inputs**

* Legacy session files: `data/sessions/**` (v1) — shape varies.
* Finalized scribe logs: `data/session-logs/sessions/session_####[a-z]?_YYYY-MM-DD.jsonl` (may be multi-part).
* Character files (for **level**, used to derive tier).
* (Optional) Any metadata needed to map legacy “attendees/AP” when logs are unavailable.

**Outputs**

* **Completed v2 session reports** → `data/session-reports/session-####.yaml`
* **Canonical AP ledger** (append-only) → `data/ap-ledger.yaml` (create if missing)
* **Reconciliation report** (JSON or YAML) → `docs/dev/migrations/reconcile-2025-AP-ledger.json`
* **Migration run log** (plain text) → `docs/dev/migrations/reconcile-2025-AP-ledger.log`

> All writes are ordinary files in-repo so you can review in git.

---

## 3) Safety & operator workflow

1. **Branch & backup**

  * Create a branch, e.g., `git checkout -b chore/migrate-ap-ledger`.
  * Ensure **clean git** (`git status --porcelain` empty).
  * Optional: archive a pre-migration snapshot.

2. **Dry-run**

  * Run the script with `--dry-run` to list sessions it would convert, counts of logs discovered, and a preview of ledger entries per session.
  * No writes in dry-run.

3. **Execute**

  * Run without `--dry-run`. The script writes all artifacts atomically per session (see §7 for write order).
  * Re-run safe: the script is **idempotent** (see §6). It won’t duplicate ledger entries or rewrite identical reports.

4. **Review & commit**

  * Inspect diffs in `data/session-reports/`, `data/ap-ledger.yaml`, and the `reconcile-*.json`.
  * Commit or revert as needed.

---

## 4) Session inventory & discovery

* **Enumerate sessions** from legacy `data/sessions/` filenames and/or embedded IDs. Normalize to `session-####`.
* For each `session-####`, **discover finalized logs** by globbing:

  * `data/session-logs/sessions/session_####_*.jsonl`
  * `data/session-logs/sessions/session_####[a-z]_*.jsonl`
* Sort parts by filename date (YYYY-MM-DD), tie-break by suffix (none < `a` < `b` …).
* Compute:

  * `sessionDate` = earliest real-world timestamp across all parts,
  * `gameEndDate` = latest (if derivable from logs),
  * `scribeIds[]` = sorted basenames of discovered parts (may be empty if no logs exist for that session).

> Multi-part handling mirrors `weave ap apply`.

---

## 5) Producing v2 session reports

For each `session-####`:

1. **Base record**

   ```yaml
   id: "session-####"
   status: "completed"
   scribeIds: [ ... ]             # basenames; may be empty if no logs were preserved
   sessionDate: "<earliest real-world ts from logs if any; else best-effort>"
   gameStartDate: "<from logs if present; else carry from legacy if present>"
   gameEndDate: "<from logs if present>"
   attendance:
     characterIds: [ ... ]        # from logs; if logs missing, fall back to legacy attendees
     guests: [ { name, note? } ]  # optional, from logs only
   ```

  * **Attendance source:** prefer logs; if no logs, fall back to legacy session attendees.
  * Do **not** include absence data; do **not** add `absenceAllocations[]` during migration.

2. **Per-character pillar results**

  * If logs exist: compute from AP events using event-level `{ number, maxTier }` and the era rules (grandfather/cap).
    Missing `maxTier` ⇒ 1. Missing AP for an attending character ⇒ zeros.
  * If logs are **missing**: carry over pillar deltas from legacy session data if present (see §6.3 for reason tagging).

> Completed reports written by migration are **immutable** going forward.

---

## 6) Generating the canonical ledger

### 6.1 Entry kind & shape

* Append one `session_ap` entry per **(session, character)** with:

  * `sessionId`, `characterId`,
  * `pillars.{combat|exploration|social}` → `{ delta: number, reason, note? }`.
* Optional audit: `source.scribeIds[]` (if logs existed), `source.migratedAt` (UTC ISO).

### 6.2 With logs present

* Parse all AP events; derive character tier from **current level** (missing level ⇒ Tier 1).
* For ≤0019: include over-tier events and mark pillar `reason: "grandfathered"` if any over-tier contributed; else `"normal"`.
* For ≥0020: **exclude** over-tier events; if any exclusion occurred, pillar `reason: "cap"`; else `"normal"`.
* If a pillar has **no events** for an attending character → `{ delta: 0, reason: "normal" }`.

### 6.3 With logs missing (fallback to legacy session data)

* If the legacy session file provides pillar totals per character, **use those deltas**.

  * Set `reason: "correction"` and `note: "imported from legacy session file (no logs)"`.
  * This preserves your historical accounting without inventing event-level gates that aren’t provable.
* If neither logs nor legacy AP exist but the character attended → write `{ delta: 0, reason: "normal" }`.

> **Absence:** do **not** write absence credits or allocations. No `absence_spend` is created by migration.

### 6.4 Idempotency

* Maintain a per-session **fingerprint** `{ sessionId, sorted scribeIds }` (empty list if no logs).
* If a ledger `session_ap` already exists for a (session, character) whose source still matches the fingerprint, **skip** writing a duplicate.
* If a v2 report already exists and matches what the migration would write (deep-equal on relevant fields), **skip** rewriting the file.

---

## 7) Write order & failure policy

Per session, apply this order atomically:

1. **Report first:** write/update `data/session-reports/session-####.yaml`.

  * If an identical completed report already exists → skip.
2. **Ledger second:** append `session_ap` rows for all attending characters per §6.

  * Use a temp file + rename to ensure atomic append semantics (or write a new YAML and replace).
3. **Log**: append a line to `docs/dev/migrations/reconcile-2025-AP-ledger.log` with counts (characters, deltas, reasons used).

**Failure policy**

* On any error, do **not** partially write. Emit a clear error with the session id and file path.
* Continue with the next session unless `--fail-fast` is supplied.

---

## 8) Reconciliation report

After all sessions have been processed, compute **per-character** totals:

```json
{
  "summary": { "characters": 12, "sessionsProcessed": 24, "diffs": 3 },
  "perCharacter": [
    {
      "characterId": "istavan",
      "ledgerTotals": { "combat": 5, "exploration": 7, "social": 4 },
      "fileTotals":   { "combat": 5, "exploration": 6, "social": 5 },
      "diff":         { "combat": 0, "exploration": 1, "social": -1 },
      "notes": ["legacy import for session-0011", "level missing → Tier 1"]
    }
  ]
}
```

* Location: `docs/dev/migrations/reconcile-2025-AP-ledger.json`
* “diffs” counts characters where **any** pillar differs.

> Use this artifact to guide manual corrections (e.g., editing character YAML AP totals or adding a post-migration `correction` entry).

---

## 9) Edge cases & policies

* **Multi-part logs**: Always union all parts; order by date then suffix.
* **No logs + no legacy AP**: Attendance still recorded in the report (if known); ledger writes zeros for attending characters.
* **Guests**: May be recorded in v2 reports if present in logs; they never receive ledger entries.
* **Unknown character IDs in legacy**: Fail with a clear error (or map via a user-supplied alias table if you have one).
* **Missing level**: Treat as Tier 1 for gating; add a reconciliation note.
* **Session ≤0019 with legacy AP only**: Tag pillar `reason: "correction"` (we cannot reconstruct event gates), not `grandfathered`.
  If you want to preserve “grandfathered” semantics, you can choose to retag those fallback pillars as `grandfathered`, but document that as an assumption.

---

## 10) Script interface (suggested)

This migration is a **script**, not a `weave` subcommand. Suggested interface:

```bash
# Dry-run (no writes)
node scripts/migrate-ap-ledger.js --dry-run

# Execute with defaults
node scripts/migrate-ap-ledger.js

# Options
  --sessions "0001..0024"     # restrict session range (inclusive)
  --fail-fast                 # stop on first error
  --verbose                   # print per-session details
```

**Exit codes**

* `0` = success (writes occurred or were skipped as identical)
* `1` = validation or I/O errors (see stderr)
* `2` = dry-run found issues that would fail (no writes)

---

## 11) Verification checklist (post-migration)

* [ ] v2 reports exist for every historical session with correct `id`, `status: completed`, `scribeIds[]`, `sessionDate`, attendance.
* [ ] Multi-part sessions list **all** parts in `scribeIds[]` and correct dates.
* [ ] Ledger has one `session_ap` per (session, character), reasons match policy (normal/grandfathered/cap/correction).
* [ ] No `absence_spend` was created by migration.
* [ ] Reconciliation report reviewed; outstanding diffs are understood and annotated.
* [ ] Commit all changes with a clear message, e.g., `migrate: v2 reports + canonical AP ledger + reconciliation`.

---

## 12) Follow-ups (manual or future work)

* Apply any **manual corrections**: either adjust character YAMLs or add `session_ap` with `reason: "correction"` explaining the rationale.
* Consider a small helper to **rename** legacy attendees to current character IDs if you have any aliases lingering.
* (Optional) Add a one-time **readme** banner in `docs/` noting that AP before `session-0020` may include `grandfathered` deltas and that absence credits are always runtime-derived.

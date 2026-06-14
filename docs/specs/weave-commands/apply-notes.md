# `weave apply notes` — Feasibility Brief

> **Status:** Feasibility brief — **not committed**. Captures a feasibility + LOE investigation, not a finalized command spec.
>
> **Open decision (the real fork):** output shape — **A) per-session grouped notes** vs **B) campaign-wide chronological journal**. This drives scope; see §4–§5.
>
> **Scope:** A one-time migration that organizes existing session-log notes by **in-game date**, plus a `weave apply` step that does the same going forward.
>
> **Related:** `apply-ap.md` (already extracts notes), `apply-trails.md`, `apply-hexes.md` (sibling appliers / output pattern).
>
> **Captured:** 2026-06-14. File paths and line numbers below are as-of that date and will drift — re-confirm before building.

---

## 1) Goal

Take the free-form `note` events scattered through finalized session logs and **organize them by the in-game calendar date they occurred on**. Two deliverables, same core logic:

1. **Migration** — a one-time pass over all historical sessions (34 as of writing).
2. **Going forward** — `weave apply` produces the organized output for each new session.

---

## 2) Feasibility: yes — the data already supports it

**How notes work today.** Notes are events embedded in each session's JSONL stream:

```json
{"kind":"note","payload":{"text":"Defeat yeti in medium ice cave","scope":"session"}}
```

154 of them across 34 sessions (as of capture). A note carries **no in-game date** — but the date is **recoverable**, because:

- The event stream is loaded **globally sorted by `ts`** (wall-clock timestamp).
- `day_start` events carry a full `calendarDate`: `{day, month: "Pluvoris", year: 1511}`.

So the in-game date of a note = the `calendarDate` of the **most recent `day_start` before it** in the ordered stream. The derivation is mechanical and reliable — nothing new needs to be captured at record time.

**Two tailwinds:**

- The AP applier **already extracts notes** (`apply-ap.ts`, ~L266–268) into a flat `notes[]` array on the session report — with no date grouping. Date-bucketing is an *extension of code that already exists*, not greenfield.
- The note schema already defines `scope: 'session' | 'day'` (`scribe-event.ts`, ~L116–120). A per-day scope was anticipated but never used — partial groundwork is implicitly present.

---

## 3) Core algorithm (both migration and apply)

```text
currentDate = header.inWorldStart            // fallback for notes before the first day_start
notesByDate = {}                             // keyed by formatted in-game date

for event in eventsSortedByTs:
  if event.kind == 'day_start':
    currentDate = event.payload.calendarDate
  if event.kind == 'note':
    key = formatDate(currentDate)            // e.g. "1511-Pluvoris-22"
    notesByDate[key].push(event.payload.text)
```

That's the whole engine. The migration runs it over every session; `weave apply` runs it over the one being applied.

---

## 4) The open decision — output shape

This is the fork that sets scope. **Finalized `sessions/*.jsonl` must not be edited after finalization**, so this is a **derived output**, never an in-place rewrite.

### Option A — per-session grouped notes (smaller)
Notes grouped by in-game date **within each session**, emitted to the session report and/or a footprint (`footprints/notes/`). Mirrors the existing applier pattern almost exactly.

### Option B — campaign-wide chronological journal (larger, most useful at the table)
All sessions merged into one timeline, notes ordered by in-game date across the whole campaign. Matches "organize notes by in-game date" most literally, but needs:
- idempotent re-runs,
- `meta.yaml` applied-tracking for a new `notes` domain (like trails/hexes/ap),
- a merge/ordering pass across sessions.

---

## 5) LOE estimate

All work lands in **`hexcrawl-manager`** (the CLI), not the `skyreach` data repo.

| Piece | Scope A (per-session) | Scope B (campaign journal) |
|---|---|---|
| Migration over old logs (read-only pass, ~30 lines core) | ~0.5 day | ~0.5–1 day |
| `weave apply` going forward (applier + dispatcher + footprint + output + tests) | ~0.5–1 day | ~1.5–2.5 days |
| **Total** | **~1–1.5 days** | **~2–3.5 days** |

**Key insight — the migration is free.** The migration and the going-forward applier are the **same logic run two ways**. Build the applier first; the "migration" is just running it over all 34 historical sessions. Don't scope them as separate builds.

**Risk: low.** Read-only derivation from existing data. The only judgment calls are content-side, not technical (see §7).

---

## 6) Architecture touchpoints (where to plug in)

References as-of 2026-06-14 — re-confirm line numbers before building.

| Purpose | File |
|---|---|
| `weave apply` dispatcher (add `notes` mode here) | `apps/cli/src/commands/weave/commands/apply.ts` |
| Sibling appliers (pattern to follow) | `apply-trails.ts`, `apply-ap.ts`, `apply-hexes.ts` (same dir) |
| **Notes already extracted here** (flat, no dates) | `apply-ap.ts` ~L266–268 |
| Event loading (globally `ts`-sorted) | `commands/weave/lib/files/load-finalized-events-for-sessions.ts` |
| Footprint writer → `footprints/{domain}/` | `commands/weave/lib/state/write-footprint.ts` |
| Footprint schema | `packages/schemas/src/schemas/session-footprint.ts` |
| Note event schema (`scope: 'session' \| 'day'`) | `packages/schemas/src/schemas/scribe-event.ts` ~L116–120 |
| In-game date type (`{day, month, year}`) | `packages/schemas/src/schemas/campaign-date.ts` |
| Month names / seasons | `packages/schemas/src/constants/calendar-and-time.ts` (`MONTH_NAMES`, `SEASON_ORDER`) |
| First/last calendar date projectors | `apps/cli/src/services/projectors.service/{first,last}-calendar-date.ts` |

**Adding a new applier/domain** (from the existing pattern): create `apply-notes.ts`, implement `applyNotes(opts): Promise<ApplyResult>`, call `writeFootprint(footprint, 'notes')`, register a `notes` mode in `apply.ts`. Scope B additionally needs a `meta.yaml` applied-sessions list for the `notes` domain.

---

## 7) Content caveats & edge cases

- **Out-of-character / meta notes** get filed under whatever day was active. Examples seen: `"Florara for all dates, not Fructara"`, `"Rolled 10 for winter weather, but we'll save that for the next session"`. Mechanical bucketing won't distinguish diegetic from meta — filtering/re-dating those is **content tagging**, not migration work (out of scope unless wanted).
- **Notes before the first `day_start`** (e.g. a pre-day weather note at seq 3) fall back to `header.inWorldStart`.
- **Multi-day sessions** spread notes across days correctly — this is the desired behavior.
- **Forward-referencing notes** ("save that for the next session") land on the active day, not the referenced one. Acceptable.
- **Split sessions** (e.g. `session-0021a` / `0021b`, `0030a` / `0030b`) — confirm both halves feed the same date buckets.

---

## 8) Explicitly not doing (yet)

- Not editing finalized `sessions/*.jsonl` in place — output is derived only.
- Not auto-classifying meta vs. diegetic notes — mechanical date-bucketing only.
- Not adding a `day`-scoped note capture path in `scribe` — derivation from `day_start` is sufficient; the unused `scope: 'day'` is noted, not required.
- Not picking A vs B — that decision gates a promotion of this brief into a real command spec.

---

## 9) Next step

Decide **output shape A vs B** (§4). Once chosen, this brief matures **in place** into the `weave apply notes` command spec (matching the `apply-trails.md` / `apply-ap.md` structure) — no move, no renumber.

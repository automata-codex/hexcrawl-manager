# `weave trails apply` — Command Spec (v1.0)

> **Scope:** Apply **finalized session** and **standalone rollover** artifacts to the **trails** map with strict stem‑based ordering, seasonal rules, and auditable footprints.
>
> **Related:** `scribe finalize` (splitting/normalization), main `weave` spec, AP apply spec.

---

## 1) Purpose

- Discover the target artifact (session **or** rollover).
- For **sessions**: upsert and mark trail edges used this season; resolve “paradox” re‑establishments after deletions.
- For **rollovers**: maintain/persist/delete non‑permanent edges according to near/far rules; reset `usedThisSeason`.
- Write an **apply footprint** and update `meta.appliedSessions` and (for rollovers) `meta.rolledSeasons`.
- Be **idempotent**.

---

## 2) Invocation

```bash
# Plan or apply a specific file
weave trails plan data/session-logs/sessions/session_0023_2025-09-15.jsonl
weave trails apply data/session-logs/rollovers/rollover_1511-autumn_2025-10-01.jsonl

# Omit file: select the next unapplied candidate in stem order
weave trails plan
weave trails apply
```

**Exit codes (recommended):** `0` (would change / did change), `3` (already applied; idempotent), `4` (validation error), `5` (no‑op plan), `6` (I/O error), `2` (repo dirty, if you enforce cleanliness).

---

## 3) Inputs & Discovery

### 3.1 Artifacts
- **Session files**
  - `data/session-logs/sessions/session_<SEQ>_<YYYY-MM-DD>.jsonl`
  - Or multi‑part from finalize: `session_<SEQ>a_*.jsonl`, `session_<SEQ>b_*.jsonl`, …
  - Must include an initial `session_start` with `sessionDate` matching the stem date.
- **Rollover files**
  - `data/session-logs/rollovers/rollover_<seasonId>_<YYYY-MM-DD>.jsonl`

### 3.2 Discovery when `<file>` omitted
1) Read `meta.appliedSessions`.
2) Enumerate all session & rollover artifacts (prod namespaces only).
3) Sort sessions by **numeric `<SEQ>`** from the stem (suffix letters do **not** affect order).
4) Sort rollovers by **season chronology** (domain helper).
5) Select the **next unapplied** valid candidate (prompt unless `--no-prompt`).

---

## 4) Preconditions & Hard Failures

- **Already applied**: artifact stem in `meta.appliedSessions` → exit `3` (idempotent).
- **Session integrity**: file must begin with `session_start` (or `session_continue`) and end with `session_end` or `session_pause`; at least one `day_start` present.
- **Single‑season constraint**: all `day_start` must share one `seasonId`; else **fail** (multi‑season sessions must be split by `scribe finalize`).
- **Stem/date mismatch**: `session_start.sessionDate` must equal the stem date; else **fail**.
- **Chronology**:
  - **Sessions**: all prerequisite rollovers up to `currentSeason` must already be applied.
  - **Rollovers**: must be the **next unrolled season** (no skipping); else **fail**.

---

## 5) Processing Algorithm — Session

1. **Parse & validate** events.
2. **Maintain cursors:**
  - `currentSeason` from each `day_start`.
  - `currentHex` from `session_start.startHex` (or `session_continue.currentHex`), updated on `move`.
3. **For each `trail { from, to, marked:true }`:**
  - `edge = normalize(from,to)` → lower‑case `"colrow-colrow"` with endpoint sort (column letters ASC, then row numbers ASC).
  - Upsert `trails[edge] = { permanent:false, streak:0 }` if missing.
  - Set `usedThisSeason=true` and `lastSeasonTouched=currentSeason`.
  - Add to footprint `effects.session.created` when newly created.
4. **For each `move { from|null, to }`:**
  - If `from == null`, use `currentHex`; then set `currentHex = to`.
  - `edge = normalize(from,to)`.
  - If `trails[edge]` exists → set `usedThisSeason=true; lastSeasonTouched=currentSeason`.
  - If missing **and** the most recent **rollover footprint** lists `edge` in `deletedTrails` → **paradox resolution**:
    - Re‑establish: `{ permanent:false, streak:0, usedThisSeason:true, lastSeasonTouched=currentSeason }`.
    - Record under `effects.session.rediscovered`.
5. **Write**:
  - Update `data/trails.yaml` atomically.
  - Append artifact stem to `meta.appliedSessions`.
  - Emit a **footprint** under `data/session-logs/footprints/trails/`:

```yaml
id: S-<SEQ><suffix>-<YYYY-MM-DD>
kind: session
seasonId: "<seasonId>"
appliedAt: "<ISO>"
inputs: { sourceFile: "<path>" }
effects:
  session:
    created: []           # edges newly created
    rediscovered: []      # edges re-established after deletion
    touched:              # minimal before/after (optional)
      before: { }
      after:  { }
```

---

## 6) Processing Algorithm — Rollover

1. **Load** `trails.yaml` and `meta.havens`.
2. For each **non‑permanent** edge:
  - Compute **near/far** by odd‑q flat‑top hex distance ≤ 3 from any haven (domain helper uses cube distance).
  - **Near‑haven**:
    - `streak = min(3, streak + 1)`; when `streak == 3` → `permanent = true`.
    - Record under `effects.rollover.maintained`.
  - **Far‑haven**:
    - If `usedThisSeason == true`:
      - Persist, `streak = min(3, streak + 1)`; record under `persisted`.
    - If `usedThisSeason == false`:
      - Roll a real **d6**:
        - **1–3**: **delete** the edge (remove from map); record under `deletedTrails` and `farChecks[edge] = { d6, outcome }`.
        - **4–6**: persist with `streak = 0`; record under `persisted` and `farChecks`.
3. **Reset** `usedThisSeason=false` on all remaining edges.
4. **Update meta**:
  - Append `seasonId` to `meta.rolledSeasons`.
  - Append artifact stem to `meta.appliedSessions`.
5. **Emit** a rollover footprint:

```yaml
id: ROLL-<seasonId>
kind: rollover
seasonId: "<seasonId>"
appliedAt: "<ISO>"
inputs: { sourceFile: "<path>" }
effects:
  rollover:
    maintained: []
    persisted: []
    deletedTrails: []
    farChecks:
      "<edge>": { d6: 5, outcome: "persist-streak=0" }
```

---

## 7) Writes & Idempotency

- **Atomic writes** for `trails.yaml`, `meta.yaml`, and footprints.
- Re‑applying the same artifact stem is a **no‑op** and returns code `3`.

---

## 8) Data Contracts (Trails)

- **Edge key**: lower‑case `"colrow-colrow"` with endpoint sort (columns A→Z then numeric rows); e.g., `o12-o13`, `p2-q10`.
- **Trail record**:
  ```yaml
  permanent: boolean
  streak: 0|1|2|3
  usedThisSeason: boolean
  lastSeasonTouched: "<seasonId>"
  ```
- **Season ID**: `<year>-<season>` built from `day_start.calendarDate.year` + `season` (lower‑case).

---

## 9) Errors & Exit Behavior

- **Validation**: bad envelope (missing `session_start`/`day_start`, multi‑season), stem/date mismatch, duplicate stems.
- **Chronology**: missing prerequisite rollovers, out‑of‑order rollover.
- **Parse**: malformed JSONL or schema mismatch.
- **I/O**: write failures are fatal.

Success (applied or idempotent) → `0`/`3`. Failures → non‑zero (see codes above).

---

## 10) Examples

```bash
# Plan/apply the next unapplied session (stem order)
weave trails plan
weave trails apply

# Apply an explicit rollover
weave trails apply data/session-logs/rollovers/rollover_1511-autumn_2025-10-01.jsonl

# Idempotent re-apply
weave trails apply data/session-logs/sessions/session_0020_2025-08-10.jsonl
# -> already applied (3)
```

---

## 11) Future Notes

- Consider a `weave trails report` that summarizes per‑season trail churn and permanence rates.
- If multiple “haven radii” are introduced, parameterize distance thresholds in `meta`.

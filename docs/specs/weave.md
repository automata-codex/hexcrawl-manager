# `weave` — Spec (v1)

## Purpose

Apply finalized artifacts (session JSONL logs and standalone season rollovers) to the campaign state with strict chronology, idempotency, and auditable footprints.

## Inputs

* **Session file** (`sessions/session_<SEQ>_<DATE>.jsonl`, or dev variants)
  Records of:

  * `session_start { id, startHex }`
  * `day_start { calendarDate, season }`
  * `move { from|null, to, pace }`
  * `trail { from, to, marked:boolean }`
* **Rollover file** (`sessions/rollovers/rollover_<seasonId>_<DATE>.jsonl`)
  Minimal: `{ "kind": "season_rollover", "seasonId": "<id>" }`
  (No dice/results inside; `weave` computes outcomes and writes them in a footprint.)

## State & Files

* `data/trails.yaml` — **central map**

  ```yaml
  trails:
    q12-q13:
      permanent: false
      streak: 1          # 0..3
      usedThisSeason: true
      lastSeasonTouched: "1511-autumn"  # lower-case seasonId
  ```
* `data/meta.yaml` — **small index**

  ```yaml
  meta:
    appliedSessions: []      # file ids applied in order
    rolledSeasons: []        # ["1511-autumn", ...] lower-case
    havens: [p13, n12, ...]  # hex ids (lower/upper allowed; compare case-insensitive)
  ```
* `data/footprints/` — **one YAML per apply**
  Filename: `<UTC-ISO>__<ID>.yaml`
  Schema:

  ```yaml
  id: ROLL-1511-autumn | S-2025-09-15-023a  # any stable id you derive
  kind: "rollover" | "session"
  seasonId: "1511-autumn"
  appliedAt: "2025-09-15T21:15:03Z"
  git: { headCommit: "<sha>" }          # optional
  inputs: { sourceFile: "sessions/..." }

  effects:
    session:                             # present for session files
      created:   ["q12-q13"]             # upserted edges
      usedFlags: { "q12-q13": true }     # edges set usedThisSeason=true
      rediscovered: ["o12-o13"]          # paradox re-establishments
    rollover:                            # present for rollovers
      maintained:    ["p13-q13"]         # near havens (no roll)
      persisted:     ["o12-o13"]         # far used OR far rolled 4–6
      deletedTrails: ["q12-q13"]         # far unused rolled 1–3 (hard delete)
      farChecks:
        o12-o13: { d6: 5, outcome: "persist-streak=0" }
        q12-q13: { d6: 2, outcome: "deleted" }

  # Optional, only affected edges (keeps files small)
  touched:
    before: { q12-q13: { permanent:false, streak:0, usedThisSeason:false } }
    after:  { q12-q13: { permanent:false, streak:0, usedThisSeason:true, lastSeasonTouched:"1511-winter" } }
  ```

## Normalization

* **Season IDs:** build from `day_start.calendarDate.year + "-" + season`; store **lower-case** (case-insensitive compare).
* **Edge key:** canonicalize by sorting endpoints with **(column letters, then numeric row)**; store **lower-case** as `"{col}{row}-{col}{row}"` (e.g., `p2-q10`, `o12-o13`).
* **Hex distance:** odd-q, flat-top → convert to cube coords and use cube distance; “near haven” = distance ≤ 3.

## Chronology & Idempotency

* **Strict order:** you may only apply:

  * a **ROLL** for the next unrolled season, or
  * a **session** whose `seasonId` is **≥** last rolled season, and **all** required ROLLs up to that season are already applied.
* **Already applied:** if a file’s id is in `meta.appliedSessions`, treat as no-op (exit code `3` on apply).
* **Idempotent:** re-applying the same file makes no changes.

## Session Apply — Algorithm

1. **Parse** events; require at least one `day_start`. Maintain cursors:

  * `currentSeason` (updated on each `day_start`)
  * `currentHex` (seeded by `session_start.startHex`; updated on each `move`)
2. **Chronology check:** all events must share the same `seasonId`. If not, **fail** (sessions should be season-homogeneous; splitting happens in `scribe finalize`).
3. **For each `trail {from,to,marked:true}`:**

  * `edge = normalize(from,to)`
  * Upsert `trails[edge]` with defaults `{ permanent:false, streak:0 }`
  * Set `usedThisSeason=true` and `lastSeasonTouched=currentSeason`; record in `effects.session`.
4. **For each `move {from|null,to}`:**

  * If `from` is null → use `currentHex`; set `currentHex=to`.
  * `edge = normalize(from,to)`.
  * If `trails[edge]` exists → set `usedThisSeason=true; lastSeasonTouched=currentSeason`.
  * If not exists **but** the **most recent ROLL footprint** lists `edge` under `deletedTrails` → **paradox resolution**: re-establish with `{ permanent:false, streak:0, usedThisSeason:true, lastSeasonTouched=currentSeason }`; add to `effects.session.rediscovered`.
5. **Write** updated `trails.yaml`; append file id to `meta.appliedSessions`; emit footprint.

## Rollover Apply — Algorithm

1. **Load** `trails.yaml` and `meta.havens`.
2. For each **non-permanent** edge:

  * Compute near/far by distance to any haven (≤3 = near).
  * **Near-haven:** `streak = min(3, streak+1)`; if `streak==3` → `permanent=true`. Record in `maintained`.
  * **Far-haven:**

    * If `usedThisSeason==true`: persist, `streak=min(3, streak+1)`. Record in `persisted`.
    * If `usedThisSeason==false`: **roll a real d6** (no seeding).

      * 1–3 → **hard delete** the edge (remove from `trails`). Record in `deletedTrails` and `farChecks[edge]`.
      * 4–6 → persist with `streak=0`. Record in `persisted` and `farChecks[edge]`.
3. **Reset** `usedThisSeason=false` on all remaining edges.
4. **Append** `seasonId` to `meta.rolledSeasons`; add file id to `appliedSessions`.
5. **Emit** rollover footprint (with real d6 results in `farChecks`).

## Commands

### `weave plan <file>`

* Validates chronology & prerequisites (missing ROLL → fail).
* **Session plan:** list edges to create, edges flipping `usedThisSeason`, and any **rediscovered** edges (based on last ROLL footprint’s `deletedTrails`).
* **Rollover plan:** show how many would be maintained / persisted / deleted; note that **d6 rolls occur at apply** (no RNG during plan).
* **Exit codes:** `0` (would change state), `5` (no-op), `3` (already applied), `4` (validation error).

### `weave apply <file> [--allow-dirty]`

* Refuses if Git working tree is dirty (unless `--allow-dirty`).
* Enforces **strict chronology** and **already-applied** guard.
* Runs the corresponding algorithm (session or rollover), writes state + footprint, updates `meta`.
* **Exit codes:** `0` (applied ≥1 change), `5` (no-op), `3` (already applied), `2` (repo dirty), `4` (validation error), `6` (I/O error).

### `weave status`

* Prints Git cleanliness, last N `appliedSessions`, last rolled season, and the **next unapplied** item(s) in chronological order.

### `weave doctor`

* Reports:

  * Pending **required rollovers** before the next session.
  * Out-of-order or multi-season files (should have been split by `scribe finalize`).
  * Trail counts: permanent / non-permanent / currently `usedThisSeason:true`.

## Error Conditions (examples)

* **No `day_start` in session** → validation error.
* **Multi-season session** → validation error (finalize should have split).
* **Rollover applied twice** → already applied.
* **Session requires unrolled season** → validation error with message:
  “Missing rollover(s): 1511-winter, 1512-spring.”

## Implementation Hints

* Read/Write YAML atomically (temp file + rename).
* Keep helpers:
  * `normalizeSeasonId(s: string) -> string` (lower-case)
  * `parseHexId(s: string) -> { col: string, row: number }`
  * `edgeKey(a: hex, b: hex) -> string` (canonical order)
  * `oddqToCube(hex) -> {x,y,z}` and `cubeDistance(a,b) -> int`
  * `listLastRolloverDeletedEdges() -> Set<string>` (from latest ROLL footprint)
* Keep **plan** and **apply** logic in one core function with `dryRun` flag so they never diverge.

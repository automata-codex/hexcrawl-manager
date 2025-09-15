# `skyreach weave` — post-session processor

## Purpose

Read a **finalized** session log (`data/session-logs/sessions/*.jsonl`) and update canonical YAML data files in the repo. Keeps the repo as the source of truth while letting the GM log quickly during play.

## Inputs

* One or more finalized JSONL logs (the files produced by `scribe finalize`).
* Repository data folders (read/write):

  * `data/trails/` (YAML)
  * (Later/optional) `data/sessions/` summaries, per-PC advancement tallies, etc.

## Outputs (current scope from this thread)

* **Trails:** create or update one YAML file per undirected edge between hexes.

  * Path format: `data/trails/<a>-<b>.yml` where `<a><b>` is a **normalized, sorted** hex pair (e.g., `p13-q13.yml`)—same convention as your existing `add-trail` tool.
  * File schema (aligned with your prior `TrailData`):

    ```yaml
    from: p13
    to: q13
    uses: 3
    isMarked: true
    lastUsed: "15 Aestara 1511"   # if available; else use session date or today
    ```
  * Update rules:

    * For each `trail { from, to, marked }` in the log, increment `uses` (default 0→1), set `isMarked: true` if `marked` appears at least once, and set `lastUsed` to the latest available in-world date for that session (or leave unchanged if none).
    * Normalize hex IDs to lowercase; sort pair `(a,b)` so filename is stable.

* **(Planned) Advancement aggregation:** parse `advancement_point` events and emit a machine-readable tally file (e.g., `data/sessions/advancement/<sessionId>.yml` or per-PC rollups). Not required for MVP; reserved in the spec so events are future-proof.

* **(Planned) Daily work summaries:** optional session summaries (ticks used per day) for reports; not required for MVP.

## Behavior & guarantees

* **Idempotent processing:** running `weave` multiple times on the same finalized log yields the same YAML state.
* **Read-only for in-progress logs:** `weave` ignores `data/session-logs/in-progress/`.
* **Dry-run & report:** support a dry-run that prints the intended changes. Produce a short report per run (changed files, additions, warnings) to stdout and optionally to a file (e.g., `data/session-logs/weave-reports/<timestamp>.txt`).
* **Safety:** before first write in a run, optionally back up any file that will be modified (e.g., `*.bak` or a `.weave/` cache).

## Minimal `weave` flow

1. Read finalized session JSONL.
2. For each event in order:

  * `trail` → normalize `(from,to)`, load or create the YAML at `data/trails/<a>-<b>.yml`, mutate fields (`uses`, `isMarked`, `lastUsed`), write back.
  * `advancement_point` → accumulate into an in-memory structure for later reporting/output (future phase).
  * `day_start|work|rest|note|move|party_set|session_start|session_end` → ignored for YAML mutations in MVP; may be used for summaries later.
3. Print a report; exit non-zero if any write failed.

## Appendix: normalization rules

* **Hex IDs:** store in lowercase in YAML (`p13`, `q13`), but accept any case at input. For trail filenames, **sort** `(a,b)` lexicographically after normalization.
* **Dates:** `lastUsed` is a free-form in-world string (e.g., `15 Aestara 1511`). If the session never specified an in-world date, you may omit or leave as-is.
* **Pillars/tiers:** constrained to:

  * `pillar`: `explore|social|combat`
  * `tier`: `1|2|3|4`

## Examples

### Example `scribe` (finalized) log (excerpt)

```jsonl
{"seq":1,"ts":"2025-09-08T18:00:00Z","kind":"session_start","payload":{"status":"inprogress","id":"session-19","startHex":"P13"}}
{"seq":2,"ts":"2025-09-08T18:05:00Z","kind":"party_set","payload":{"ids":["alistar"]}}
{"seq":3,"ts":"2025-09-08T18:10:00Z","kind":"move","payload":{"from":null,"to":"P14","pace":"normal"}}
{"seq":4,"ts":"2025-09-08T18:15:00Z","kind":"trail","payload":{"from":"P14","to":"Q14","marked":true}}
{"seq":5,"ts":"2025-09-08T18:20:00Z","kind":"ap","payload":{"pillar":"explore","tier":2,"note":"mapped the canyon","at":{"hex":"Q14","party":["alistar"]}}}
{"seq":6,"ts":"2025-09-08T18:30:00Z","kind":"day_start","payload":{"date":"15 Aestara 1511"}}
{"seq":7,"ts":"2025-09-08T18:35:00Z","kind":"work","payload":{"ticks":2,"reason":"move"}}
{"seq":8,"ts":"2025-09-08T21:00:00Z","kind":"rest","payload":{}}
{"seq":9,"ts":"2025-09-08T22:00:00Z","kind":"session_end","payload":{"status":"final"}}
```

### Resulting/updated trail YAML

`data/trails/p14-q14.yml`

```yaml
from: p14
to: q14
uses: 1
isMarked: true
lastUsed: "15 Aestara 1511"
```

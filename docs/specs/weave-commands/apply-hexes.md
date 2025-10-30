# `weave apply hexes` — Spec v1.0

## Purpose

Update hex YAML files to reflect **scouted**, **visited**, and **explored** status (global, not per-party) based on finalized logs, and add the `landmark-known` tag when a scout reveals the landmark.

Schema fields affected (from `HexSchema`):

* `isScouted?: boolean`
* `isVisited?: boolean`
* `isExplored?: boolean`
* `tags?: (KnownTag | string)[]` — we may add `landmark-known`

## Command surface

* Integrated: `weave apply` runs this updater as one of its steps.

  * Inherits parent `--dry-run` behavior (if parent is dry-run, so is this; otherwise write).
* Direct: `weave apply hexes [--dry-run]`

  * Only flag: `--dry-run`
  * Default when invoked directly: `true` (preview/plan only).

*No additional filters/flags in v1.0.*

## Inputs

* Finalized session logs (authoritative).
* Hex YAML files at `data/hexes/<regionId>/<hexId>.yml` (one per hex; **must exist**).
* Repo paths/config (existing helpers).

## Event → State mapping (independent; no back-fill)

* **Scouted**
  `event.kind === 'scout'` and `event.payload.target === H` → set `isScouted: true`.

  * If `event.payload.reveal.landmark === true` → ensure `tags` contains `landmark-known`.
* **Visited**
  `event.kind === 'move' | 'arrive'` with destination hex `H` (use finalized payload’s destination field, e.g., `payload.to` or equivalent) → set `isVisited: true`.
* **Explored**
  `event.kind === 'explore'` and `event.payload.target === H` → set `isExplored: true`.

Notes:

* Fields are **independent**; we do not infer one from another.
* Booleans are **monotonic** (only ever set to `true`; never unset).
* Tags are de-duplicated; existing order is preserved, new tag appends if missing.

## File resolution & indexing

* Build an in-memory **index** on start by scanning `data/hexes/**/*.yml` once:

  * Map `{ [hexId: string]: absoluteFilePath }`.
  * `hexId` is the lowercase ID (e.g., `q12`), matching `HexId` rules.
* All updates resolve via this index.
* If a hex needed by logs is **absent** from the index → **fail hard** with `HexFileNotFoundError(hexId)`.

## Data model (internal)

```ts
type HexIntent = {
  scouted?: true;
  visited?: true;
  explored?: true;
  landmarkKnown?: true;
};
type HexIntents = Record<string /* hexId */, HexIntent>;
```

## Algorithm

1. **Index**
   Scan `data/hexes` once to build `{hexId -> path}`.

2. **Collect intents** from finalized events (for the sessions in scope of `weave apply`, or all finalized logs when invoked directly—match your existing apply scope rules):
   * `scout`: `intents[target].scouted = true`; if `reveal.landmark` → `intents[target].landmarkKnown = true`.
   * `explore`: `intents[target].explored = true`.
   * `move/arrive`: resolve destination hex field (e.g., `payload.to` / `payload.hex`) → `intents[dest].visited = true`.

3. **Apply per hex** (for each `hexId` present in `intents`):

   * Resolve file via index; if missing → throw `HexFileNotFoundError`.
   * Load YAML (parse to JS object).
   * Compute a minimal patch:
     * If `intents[H].scouted` and `isScouted !== true` → set `isScouted = true`.
     * If `intents[H].visited` and `isVisited !== true` → set `isVisited = true`.
     * If `intents[H].explored` and `isExplored !== true` → set `isExplored = true`.
     * If `intents[H].landmarkKnown` → ensure `tags` exists and includes `landmark-known`.

   * If patch is empty → skip writing for that file.
   * Else:
     * If `--dry-run` → stage a diff preview only.
     * Otherwise → write the updated YAML.

4. **Output & exit**
   * Print a compact summary table (see below).
   * Respect exit codes (see below).

## YAML write policy

* Only mutate the four target fields (`isScouted`, `isVisited`, `isExplored`, `tags`).
* Preserve all other content (`name`, `landmark`, `notes`, etc.).
* Serialization: use your standard YAML writer/config for consistent formatting.
* Atomicity: write via temp file + replace (match your repo’s common helper if available).

## Output / UX

* **Summary table** (always):

  * Columns: `HEX | scouted | visited | explored | +landmark-known | file`
  * Mark each column with:

    * `✓` if the run will set/has set the field/tag this time,
    * `•` if already true/present (no change),
    * blank if not applicable/absent.
* **Dry-run**:

  * Show summary + unified diffs for files that would change (reuse the standard printer if you have one).
* **Totals**:

  * `X hexes changed`, `Y hexes scanned`, `Z no-ops`.
* **Errors**:

  * Missing hex file aborts the run; print the missing `hexId` and the event/session that referenced it (if available).

## Error handling & exit codes

* `HexFileNotFoundError(hexId)` → **fail hard**. Map to your “invalid/corrupt input / not found” class (choose the code consistent with your mapper; if following your earlier pattern, likely `2` or `4`).
* YAML read/write failures → existing IO error mapping.
* Dry-run with no changes → `0`.
* Successful apply (changes or no changes) → `0`.

## Performance considerations

* Single **directory scan** for the index; do not scan per event.
* Avoid rewriting files when patch is empty (idempotent re-runs are fast).
* If many files will change, consider batching writes (no ordering dependency here).

## Test matrix

1. **Scout only**
   * Input: one `scout` to `q12` (no reveal).
   * Expect: `isScouted: true` (others unchanged).

2. **Scout with landmark reveal**
   * Input: `scout` to `q12` with `reveal.landmark = true`.
   * Expect: `isScouted: true`, `tags` gains `landmark-known` (no dupes on re-run).

3. **Visit only**
   * Input: `move/arrive` to `q12`.
   * Expect: `isVisited: true` only.

4. **Explore only**
   * Input: `explore` with `payload.target = q12`.
   * Expect: `isExplored: true` only.

5. **Combined order** (scout → move → explore)
   * Expect: all three flags set; tag set if reveal occurred.

6. **Idempotency**
   * Second run with same logs → zero writes; summary shows `•` for already-true fields.

7. **Existing tags present**
   * Starting `tags: ['haven']`; reveal landmark → tags becomes `['haven', 'landmark-known']`.

8. **Missing hex file**
   * Event references `r99` which has no file → throws `HexFileNotFoundError('r99')`, run aborts with mapped exit code.

## Implementation hooks

* **Collector**: `collectHexIntents(finalizedEvents): HexIntents`
* **Index builder**: `buildHexFileIndex(root = 'data/hexes'): Record<hexId, path>`
* **Applier** (pure core): `applyHexIntentsToDoc(doc: HexData, intent: HexIntent): { changed: boolean, nextDoc: HexData }`
* **Runner**: `weave apply hexes` command that:

  * composes the above,
  * obeys `--dry-run`,
  * prints summary/diffs,
  * throws on missing files.

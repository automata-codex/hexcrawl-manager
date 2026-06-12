# Spec: blessed beat-tag vocabulary

## Standing constraint
Pull current versions before writing: beat schema, the page/loader that assembles `BeatList`'s `filterOptions` prop, and confirm no `tags.yaml` or equivalent registry already exists. Do not infer the tag set from existing beat data — that sprawled set is the problem, not the source of truth.

## Goal
Constrain beat `tags` to a small, prep-defined situational vocabulary, killing the ~100-tag sprawl that makes the filter useless. Vocabulary must be editable mid-prep without codegen.

## Design principle (drives the cleanup)
A beat tag is the **cross-cutting situational axis** — what plotline, faction, NPC, and text-search filters don't already capture. Any tag duplicating one of those existing filters (a plotline name, faction slug, NPC name, plot-specific noun) is redundant and gets dropped or pushed to body prose. The vocabulary is "situations you prep against" (location/mode, encounter-flavor, pacing), nothing already filterable elsewhere.

## Changes

**1. `data/tags.yaml`** — new file at data root. Keyed-by-domain map (structure above); `beat` is the first vocabulary. Future vocabularies (clue, hex) added as sibling keys later — out of scope now, but structure for it.

**2. `scripts/validate-tags.ts`** — warnings-only validator, modeled on `validate-plotline-refs.ts` (loader + `formatReport`-style output + env strict-gate). Loads `tags.yaml` and all beats; flags any beat tag not in `tags.yaml`'s `beat` list. Report groups offenders by tag (so cleanup is "here are the 6 beats using `kobold-warren`, decide once") rather than by beat. Non-strict by default; `ACHM_STRICT_TAGS=1` fails the build, flipped on after cleanup — same lifecycle the plotline validator documents.

**3. Cleanup pass (data, one-time)** — first validator run is the worklist. Each off-vocab tag triaged: bless (add to `tags.yaml`), collapse (rename to an existing blessed tag), or drop (delete; if the info matters, it's body prose). This is the actual fix; the file and validator just enable and guard it.

**4. Filter-options wiring — confirm, likely no change.** If the `filterOptions.tags` assembly derives from the union of beat tags, cleanup shrinks the dropdown automatically — no code change. If it reads a config, point it at `tags.yaml`'s `beat` list. `BeatList.svelte` itself needs no change either way — it renders whatever `filterOptions.tags` contains.

## Explicitly not doing
- Not converting beat `tags` to a TS enum — YAML chosen for mid-prep edit-without-codegen.
- Not filtering the dropdown in the UI while leaving sprawl on beats — that hides offenders and makes off-vocab-only beats unfilterable (component line 84 confirms membership-match). Data is the fix.
- Not migrating clue/hex `KnownTagEnum`s into `tags.yaml` yet — logged as additive follow-up.

## Verification
Run `validate-tags.ts` → triage to zero warnings → flip `ACHM_STRICT_TAGS=1` → confirm dropdown shows only blessed tags and every beat is still reachable by at least one.

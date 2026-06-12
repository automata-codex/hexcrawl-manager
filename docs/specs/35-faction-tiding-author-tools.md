# Spec: faction tiding authoring aids (two CLI tools)

## Standing constraint
Pull current versions of every file/schema named here before writing — beat, clue, faction, roleplay-book, plotline schemas, and `plotline-refs-analyzer.ts`. Confirm shapes before coding. In particular, re-confirm `parseBodyMentions` and `extractCandidateLabel` are still exported from the analyzer; this spec reuses them as a library.

## Context
Two complementary tools, modeled on `validate-plotline-refs.ts` (tsx script, loader helpers, `formatReport`-style output, warnings-only exit). Reuse the analyzer's exported pure functions rather than reimplementing body parsing.

Tool A is a per-faction authoring convenience (over-inclusive on purpose). Tool B is the global completeness backstop. They are not redundant: A misses faction-untagged / unnamed-in-body / no-book content; B catches exactly that.

---

## Tool A — faction surfacing aid

**Invocation:** `tsx scripts/faction-tidings-aid.ts [faction-id]` — one faction, or all if omitted.

**Gather, for faction F:**

Build the faction→plotline set as the **union** of:
1. `faction.plotlines` (explicit field), and
2. body-derived: for each plotline, run `parseBodyMentions(body)`, resolve `factionIds`/`factionNames` against the faction collection using the analyzer's name-normalization (reuse `normalizeName` semantics — match IDs, then case-folded names), keep plotlines whose resolved faction set includes F.

Then collect:
- **Beats under F**, from two sources, deduped, each tagged with how it surfaced (`direct` vs `via-plotline:<slug>`):
  - direct: beats where `beat.factions` includes F
  - transitive: every beat under any plotline in F's plotline set (walk plotline `beats[]` / the `beats/` dir)
- **Clues under F**, deduped, similarly tagged:
  - direct: `clue.factions` includes F
  - transitive: `clue.plotlines` intersects F's plotline set

**Filter to live:** beat `status` ∈ {pending, active}; clue `status` = unknown; `campaignStatus` = active on both. (Surfacing is read-only — never writes status.)

**Output:** grouped by faction, beats and clues listed with their surfacing tag, so you can see at a glance which are F's own vs inherited through a shared plotline. Over-inclusion is intended: better to show a via-plotline beat you then judge irrelevant than to miss one.

**Note for CC:** this same gather is the engine behind a future on-page "live threads for this faction" panel on `/gm-reference/factions/[id]`. Build the gather as a reusable function, CLI as one caller, so the panel can reuse it later. Don't build the panel now — log it.

---

## Tool B — beat tiding orphan-catcher

**Invocation:** `tsx scripts/beat-tiding-coverage.ts`

**Do NOT reuse the analyzer's `orphan-beat` warning** — that checks beat-file-vs-plotline-`beats`-array sync, a different predicate. This tool checks beat-vs-tiding coverage.

**Logic:**
1. **Live beats:** all beats with `status` ∈ {pending, active} and `campaignStatus` active. Each identified by compound `<plotlineSlug>/<beatSlug>`.
2. **Linked beats:** scan every roleplay book; for each, walk `intelligenceReports.rows` and `intelligenceReports.situational`; collect `linkId` where `linkType === 'beat'`. (This depends on the `'beat'` link type from the prior spec being merged — note the ordering dependency.)
3. **Orphans:** live beats whose compound id appears in no collected `linkId`.

**Output:** the orphan list — live beats surfaced by no tiding. This is the actual "don't forget" signal; Tool A is the ergonomic way to work the list down, Tool B confirms you did. Warnings-only exit, matching the plotline validator's non-strict default; a strict env gate (mirroring `ACHM_STRICT_PLOTLINE_REFS`) can be added later if you ever want CI to enforce coverage — log, don't build yet.

**Known residual (document, don't fix):** body-derivation matches proper faction names only, so a plotline that refers to a faction obliquely ("the kobolds") won't link it in Tool A. Tool B backstops this. If oblique-reference misses ever bite in practice, the fix is faction aliases — log it, don't build it.

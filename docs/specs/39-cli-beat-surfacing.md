# CC Brief — Surface anchored beats in the CLI (alongside clues)

## Goal

Extend the existing CLI hex-surfacing — the path that already surfaces unpresented clues
when the party moves into or fast-travels through hexes — to **also** surface live,
unpresented **beats** anchored to those hexes via the new `landmark.beats` /
`hiddenSites[].beats` fields. This is the _push_ counterpart to the hex-detail rendering
(_pull_): it puts an anchored beat in front of the GM on movement, so a wander-into beat
like _The Refugees' Lament_ at Secessa (`j7`) isn't silently walked past.

## Depends on

Schema brief "Structured beat anchoring on hexes" must land first — this consumes the
`beats` field it adds. Do not start until `landmark.beats` / `hiddenSites[].beats` exist
and validate.

## Read first (do not infer)

- The existing clue-surfacing logic in the `move` and fast-travel commands
  (`../hexcrawl-manager`, `scribe`/`weave`). **Locate it and mirror it** — this brief is
  "do for beats what you already do for clues," and the existing implementation is the
  spec for shape, output formatting, and where the hex set comes from. Do not reconstruct
  it from this brief's description.
- `../hexcrawl-manager/packages/schemas/src/schemas/plotline.ts` — the
  `PlotlineBeatStatusEnum`. The beat gating predicate depends on which status values mean
  "live / not yet surfaced" vs. "done / terminal," and this is **not** the same predicate
  as clues. Do not guess the enum values.

## The change

In the same place the movement commands gather a hex set and pull unpresented clues from
each hex's `landmark.clues` / `hiddenSites[].clues`, also pull beats from that hex's
`landmark.beats` / `hiddenSites[].beats` and return them in the same surfacing output,
clearly distinguished from clues.

- `move <hex>` passes its single destination hex.
- Fast-travel passes its intervening-hex list. **This is the higher-value trigger** —
  single-hop `move` is when the GM is already paying attention; fast-travel is when the
  journey is being hand-waved and skipped content is structurally guaranteed. The command
  already knows the hexes it's skipping, so beats fall out of the same query for free.

Same query, callers that already exist — you are widening what the query returns, not
adding new entry points.

## Gating predicate (differs from clues)

- **Clues** surface when `status: unknown` (the GM-presentation flag).
- **Beats** surface when their plotline-beat status is **live and not yet terminal**, per
  `PlotlineBeatStatusEnum` (confirm the exact values in `plotline.ts`). A beat that is
  already resolved/done must not surface. This is a different field and a different
  predicate — do not reuse the clue `status` check.

Resolve each beat ID in a `beats` array to its beat (plotline + slug) to read its status;
reuse the same beat-ID resolution the schema validation uses (canonical `'beat'` LinkType
format).

## Out of scope / known blind spots (intended, document them)

- **Temporal beats** (date-triggered, e.g. a column arriving on a fixed evening) are
  **not** caught here and should not be. A hex push structurally can't see them; they want
  a separate session-open "what's due" calendar surface, which is a later, different build.
  A pure hex push catching spatial beats and missing temporal ones is the correct v1
  behavior — just make sure it's known, not silent.
- **Relational/ambient beats** (delivered by faction/NPC presence, not location) are not
  anchored in any hex `beats` field, so they correctly will not surface here. They belong
  to the faction-tidings channel.

## Confirm back to Alex

- Output treatment: should anchored beats render in the same block as surfaced clues, or a
  separate "Beats here" section in the movement output? (Recommend separate, labeled.)
- Whether fast-travel should de-duplicate a beat anchored on multiple intervening hexes
  (unlikely given placement, but confirm the desired behavior).
- Exact `PlotlineBeatStatusEnum` values that count as "surface" vs. "suppress."

---
'@achm/core': minor
'@achm/schemas': patch
'@achm/web': patch
---

Surface per-reference clue discovery context through the reference chain,
sharpen the beat/clue/encounter schema descriptions, and add an advisory
clue-placement check.

**Core** (`@achm/core`):

- `resolveBeat` now carries the per-reference `context` through to its
  resolved clues. `ResolvedClueRef` gains an optional `context?: string`,
  populated from `normalizeClueRef`, so consumers can show *where/how* a
  beat's clue is discovered, not just which clue it is. Additive and
  backward-compatible.

**Schemas** (`@achm/schemas`):

- Rewrote the top-level `.describe()` on `BeatSchema`, `ClueSchema`, and
  `EncounterSchema` to draw sharp boundaries between the three concepts —
  a beat is a one-time node in a single plotline's arc, an encounter is a
  reusable runnable scene, and a clue is a fact the party can learn.
  Description-only; no field, validation, or type changes.

**Web** (`@achm/web`):

- Render the clue discovery `context` wherever clues are listed — encounter,
  NPC, beat, and dungeon detail pages. A page with any contextual clue
  switches to a bulleted list (context shown beneath each clue in italic,
  weak-coloured text); a page with none keeps the compact inline format.
- Add an advisory `validate:placements` script
  (`scripts/validate-clue-placements.ts`) that reports clues whose placement
  count falls below their `minPlacements` floor. It reuses the web app's
  `buildClueUsageMap` as the single source of truth and always exits 0, so it
  runs in `prebuild` (non-blocking) without ever failing a build.

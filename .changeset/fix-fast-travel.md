---
'@achm/cli': minor
'@achm/data': minor
---

Make scribe's `fast` command usable for real multi-day journeys: one command
walks the party along the whole trail route, auto-advancing days and weather,
rolling per-hex encounter chances from hex/region data, and pausing in-hex for
the GM to roll encounters manually. Implements
`docs/plans/19-fix-fast-travel.md`.

**CLI** (`@achm/cli`):

- **Multi-day travel** — new `driveJourney` orchestrator wraps the pure
  single-day runner: when a day fills up it emits `day_end`/`day_start`,
  recomputes the daylight envelope from the new date (season-aware, so a
  trip crossing e.g. winter→spring picks up the longer days), and continues
  the route. A leg that can't fit even a fresh full day stops with a clear
  "stalled" error instead of looping; a partially-used opening day rolls
  into a fresh one first.

- **Auto-weather** — every travel day gets rolled-and-committed weather (the
  same 2d6 + forecast pipeline as interactive `weather roll`/`commit`, taken
  as-is with no overrides), including day 1 when the GM hasn't committed any.
  Forecast chains day-to-day, and bad-weather travel doublers now apply on
  any day of the trip. GM-committed day-1 weather is left untouched.

- **Per-hex encounter chance** — occurrence now uses the d20 threshold from
  the hex being entered (`hex.encounterChance`), falling back to the hex's
  region (`region.encounterChance` via the region's `hexes` membership list),
  else 0/never with a warning. Replaces the old hardcoded 5% (`roll === 1`).
  Note: typical region values (6–8) mean far more frequent encounters on
  multi-hex trips than before.

- **Prompt-to-roll encounters** — on a hit, the party travels INTO the hex
  (move + time logged), a note prompts the GM to roll on the region table,
  and travel pauses there. Fast travel no longer auto-picks a monster and no
  longer reads `default-encounter-table.yaml`.

- **Tolerant resume** — `fast resume` now verifies only the party's position
  (at the pause hex, normalized comparison) instead of an exact log hash, so
  resolving an encounter, adding notes, or day changes no longer invalidate
  the plan. Fixes two latent bugs: the old hash gate compared against a field
  Zod stripped on load, so resume was *always* "stale"; and the old
  pause-before-entering order re-rolled the same hex's encounter check on
  every resume.

- **`abort` clears the plan** — the top-level session `abort` now deletes any
  fast-travel plan tied to the session (previously only `fast abort` did).

- **Status/help polish** — `fast status` shows the real exhaustion cap
  (24 segments / 12h, was 16 / 8h) plus the day's season-derived daylight
  envelope; help text describes the multi-day flow and encounter pause.

- **Pruned dead code** — encounter-table auto-roll machinery
  (`loadEncounterTable`, `rollEncounterType`, `rollEncounterEntry`,
  `weightedRandomSelection`), `computeSessionHash`, the plan's
  hash/seq/weather-flag fields, the unused `paused_stale` status, and the
  unused `daylightCapSegments` arg to `executeLeg`. Existing plan files load
  fine (obsolete keys are stripped).

**Data** (`@achm/data`):

- New `REPO_PATHS.REGIONS` (`data/regions/`), used to build the hex→region
  encounter-chance index.

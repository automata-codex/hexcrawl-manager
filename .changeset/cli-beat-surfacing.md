---
'@achm/cli': minor
'@achm/data': patch
---

Surface live anchored beats in scribe, alongside hex arrival alerts. When the
party reaches a hex whose landmark or hidden sites anchor a live plotline beat
(via `landmark.beats` / `hiddenSites[].beats`), the interface announces it on a
separate, labeled line — count-only, e.g. `🎭 1 live beat(s) anchored here —
see hex j7.`

- **move / backtrack**: the beat line prints after the move, beside any clue
  or update lines.
- **fast travel**: a live beat counts as an arrival alert, so a flagged
  mid-route hex pauses the journey there (existing `paused_hex_alert` path);
  a note is written to the session log. A beat anchored on several intervening
  hexes surfaces on each. The destination completes instead of pausing, as
  with clues.

"Live" means the beat's `PlotlineBeatStatus` is `pending` or `active` (and
`campaignStatus: active`); `resolved` and `skipped` are terminal and suppressed.
Beat statuses are cached per process. Surfacing is display-only — nothing writes
to the data repo.

`@achm/data`: added `loadBeats()` / `parseBeatFile()` (reads plotline beat
frontmatter into `BeatData` keyed by canonical `plotlineSlug/beatSlug`) and
`REPO_PATHS.PLOTLINES`. The hex→beat anchor validator now resolves IDs through
this shared loader instead of its own frontmatter parsing.

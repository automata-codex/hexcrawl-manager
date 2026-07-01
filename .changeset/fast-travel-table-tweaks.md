---
'@achm/cli': minor
---

Three tweaks to scribe's `fast` travel, after the first session using it at the table:

- **Camp hex on day rollover**: when a multi-day journey rolls into a new day,
  the rollover line now names the hex the party camps in, tagged with a ⛺ so
  it's easy to spot — e.g.
  `Day rolled over → 16 Hibernis 1 (winter), weather: pleasant ⛺ Camp: P14`.

- **Show every trigger on a hex**: when a hex fires more than one thing at once
  (e.g. a random encounter *and* a pending GM update), the pause / arrival
  summary now lists them all instead of only the one that set the pause status.
  Keyed encounters and alerts are re-derived from hex data; the random encounter
  roll is carried on the run result (`randomEncounterTriggered`) so it's
  surfaced even when a keyed encounter takes precedence for the status.

- **`--no-rec` flag**: `fast <dest> <pace> --no-rec` and `fast resume --no-rec`
  skip the per-hex random encounter check (REC) for the whole journey. Keyed
  encounters and hex alerts still fire — only the random d20 roll is suppressed.
  The flag can appear in any position and is per-invocation (not stored on the
  plan), so pass it again on `fast resume` to keep REC off.

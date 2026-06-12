---
'@achm/cli': minor
'@achm/data': patch
---

Surface hex arrival alerts in scribe: when the party reaches a hex that has
unknown clues (referenced by its landmark, hidden sites, or GM dream-notes)
or pending text in its `updates` field, the interface announces it —
count-only, e.g. `🔍 2 unknown clue(s) here — see hex E7.` / `📝 This hex
has 1 GM update(s).`

- **move / backtrack**: the alert lines print after the move.
- **fast travel**: entering a flagged mid-route hex pauses the journey there
  (new `paused_hex_alert` status, same lifecycle as the encounter pause —
  progress is saved and `fast resume` continues at the next leg without
  re-checking the flagged hex). A note is also written to the session log.
  When the flagged hex is the destination itself the journey completes
  instead of pausing, and the alerts print with the arrival message. If a
  hex triggers both an alert and an encounter, the journey pauses once
  (encounter status) and both notes land in the log.

"Unknown clue" means `status: unknown` + `campaignStatus: active`; clue
statuses are cached per process. Alerts are display-only — nothing writes to
the data repo; the GM clears `updates` by hand once narrated.

`@achm/data`: added `REPO_PATHS.CLUES`.

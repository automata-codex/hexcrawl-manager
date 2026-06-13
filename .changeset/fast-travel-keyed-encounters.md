---
'@achm/cli': minor
---

Pause scribe's `fast` travel on keyed encounters: when the party enters a
route hex with a `keyedEncounters` entry that triggers on entry, the journey
stops there so the GM can run the scripted encounter, then continues with
`fast resume`.

- **Entry only**: only `trigger: entry` keyed encounters apply — `trigger:
  exploration` ones are found by searching a hex, which fast travel doesn't
  do, so they're ignored.
- **Lifecycle**: same as the encounter / hex-alert pauses (new
  `paused_keyed_encounter` status) — progress is saved and `fast resume`
  picks up at the next leg without re-triggering the keyed hex. A note naming
  the encounter id(s) is written to the session log.
- **Destination**: a keyed encounter on the final hex completes the journey
  rather than pausing (no legs remain); it's surfaced in the arrival summary.
- **Precedence**: when a hex fires several signals at once, every note still
  lands in the log, but the journey pauses once, preferring the most
  actionable status — keyed encounter > random encounter > hex alert.

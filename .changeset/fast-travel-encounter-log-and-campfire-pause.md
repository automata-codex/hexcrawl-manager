---
'@achm/schemas': minor
'@achm/cli': minor
---

Two tweaks to scribe's `fast` travel, after more sessions at the table:

- **Log every encounter check**: fast travel now emits a new `encounter_check`
  event (`hexId`, `threshold`, `roll`, `triggered`) for every d20 roll against
  a hex's encounter chance, not just the ones that trigger. `rollEncounterOccurs`
  returns the raw roll (`null` when threshold <= 0, i.e. no die was rolled)
  alongside whether it triggered, so the actual result is available for
  diagnostics even on a miss.

- **Pause on day rollover for a campfire card**: a multi-day journey that rolls
  into a new day (camp made, day ended/started, weather rolled) now stops
  there with a new `paused_day_rollover` status and a `🔥 Time for a campfire
  card!` reminder, instead of auto-advancing straight through to the next leg.
  `fast resume` picks the route back up from the parked hex. The plain `day`
  command (outside of fast travel) prints the same reminder when a day ends.

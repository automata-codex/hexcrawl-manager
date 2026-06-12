# Fix Fast Travel Implementation Plan

Make `scribe`'s `fast` command usable for real multi-day journeys: plan a route and walk
the party through every hex on it in one command, auto-advancing days (with a correct
per-day activity envelope), rolling per-hex encounter chances read from hex/region data,
and pausing to let the GM roll an encounter manually before resuming.

**Branch:** `fix-fast-travel`
**Created:** 2026-06-12

---

## Why this is needed

The command already finds a route, walks legs, logs travel time, applies terrain/weather
doublers, rolls encounters, and persists a plan — but it is unusable for trips longer than
one day because of two design choices:

1. **The runner stops at the first day boundary.** `runFastTravel()` bails with
   `paused_no_capacity` the moment a leg won't fit today's daylight or the 12h exhaustion
   cap, never advancing the day (`lib/core/fast-travel-runner.ts:144-171`,
   `// For MVP, we don't automatically advance days - pause instead`).
2. **`fast resume` rejects the plan after any log change.** Resume compares a SHA-256 of
   the entire event log against the hash stored at pause
   (`handlers/fast-travel/resume.ts:36-42`). To continue across a day you must run
   `day end` / `day start`, which mutates the log → hash changes → resume refuses. The same
   gate breaks resume-after-encounter (resolving an encounter appends events).

### Decision: pause-and-resume on encounters

When an encounter fires mid-trip, fast travel **pauses at that hex** so the GM rolls and
resolves it, then continues with `fast resume`. This requires replacing the exact-hash
integrity gate with a tolerant check (Phase 3).

### What already exists (so this is mostly wiring)

- Routing (`buildTrailGraph` / `bfsTrailPath`), leg/time math (`execute-leg.ts`), per-leg
  `time_log` emission, terrain + weather doublers.
- Day-boundary emitters that fast travel never calls: `emit-day-end.ts`,
  `emit-day-start.ts`, `emit-weather-committed.ts`.
- Date machinery: `ctx.calendar.incrementDate()` (`services/calendar.ts:92`),
  `getSeasonForDate()`, `getDaylightCapSegments(date)` — the daylight half of the activity
  envelope is **already** date-derived; it is just computed once at journey start today.
- `encounterChance` is already in the schemas: optional on `hex` (`schemas/hex.ts:220`,
  d20 threshold) and **required** on `region` (`schemas/region.ts:12`). Real data carries
  `encounterChance: 8` etc. Region→hex membership is `region.hexes: string[]`.

**No `@achm/schemas` changes are needed**, so `npm run build:json-schemas` is not required.

---

## Phase 1 — Auto-advance days + per-day activity envelope

**Goal:** A `fast <dest> <pace>` with no encounters walks the entire route to the
destination in one command, ending/starting each day automatically, recomputing the
daylight envelope from each new day's date, and auto-rolling/committing weather for every
day (day 1 included when none was committed). This alone delivers the headline fix.

### Approach

Keep `runFastTravel()` a pure, single-day function. Drive day-advancement from a thin
orchestrator that both `plan-and-execute` and `resume` call (today those two handlers are
near-duplicates of run → emit → handle; this removes that duplication).

**New file:** `apps/cli/src/commands/scribe/lib/core/drive-journey.ts`

```ts
// Pseudocode — orchestration, owns calendar + emitter I/O.
export function driveJourney(ctx, file, plan, state): FastTravelResult {
  // Day 1: if the GM never committed weather, auto-roll + commit it now (same path as
  // advanced days) so the first day's legs see any weather doubler too.
  if (!state.weather) {
    state = { ...state, weather: autoCommitWeather(file, state.currentDate) };
  }

  while (true) {
    const result = runFastTravel(state);            // pure, one day's worth of legs
    emitFastTravelEvents(file, result.events);

    if (result.status === 'completed' || result.status === 'paused_encounter') {
      return result;                                 // terminal; handled by handle-result
    }

    // status === 'paused_no_capacity' → end the day and roll into the next one.
    const madeProgress = result.events.length > 0;
    if (!madeProgress) {
      // A single leg can't fit even a fresh full day → hard stop, don't loop forever.
      return { ...result, status: 'error_no_progress' };
    }

    // End the current day with its real totals.
    emitDayEnd(file, result.finalSegments.active,
                     result.finalSegments.daylight,
                     result.finalSegments.night);

    // Start the next day; recompute the envelope FROM THE NEW DATE.
    const nextDate = ctx.calendar.incrementDate(state.currentDate, 1);
    const nextSeason = getSeasonForDate(nextDate);
    const nextDaylightCap = getDaylightCapSegments(nextDate);   // season-derived envelope
    emitDayStart(file, nextDate, nextSeason, nextDaylightCap);

    // Auto-roll + commit weather for the new day (no GM prompt; take the roll as-is).
    const weather = autoCommitWeather(file, nextDate);          // see "Auto-weather" below
    log(`Day rolled over → ${nextSeason}, weather ${weather.category}`);  // per-day progress

    state = rebuildStateForNewDay(state, result.currentLegIndex,
                                  nextDate, nextSeason, nextDaylightCap, weather);
    // active/daylight/night = 0, daylightSegmentsLeft = nextDaylightCap, weather = rolled
  }
}
```

### Auto-weather (per day, including day 1)

Each day of the journey gets real, committed weather — the first day too if the GM never
committed it — so the travel doubler applies consistently rather than only on day 1. This
is wiring, not new logic: the roll exists today, split across the interactive `weather roll`
(builds `ctx.weatherDraft`) and `weather commit` (writes the `weather_committed` event), with
the pure pieces already factored into `handlers/weather/helpers.ts` (`bandForTotal`,
`descriptorsFor`, `detailRoll`, `effectsForCategory`, `forecastAfterForCategory`,
`getSeasonForDate`). Forecast continuity already has a projector: `selectCurrentForecast`
reads the prior day's `forecastAfter`.

Extract one pure function and call it from the orchestrator:

```ts
// lib/weather/roll-weather-for-date.ts (new) — pure; ~steps 2–10 of `weather roll`, no ctx/draft.
// "Accept" = take the roll as-is: proposed category, default (suggested) descriptors, no override.
export function rollWeatherForDate(date, forecastBefore): WeatherCommittedEventPayload { ... }

// helper inside drive-journey: roll for `date`, append the event, return the committed payload.
function autoCommitWeather(file, date): WeatherCommitted {
  const events = readEvents(file);
  const forecastBefore = selectCurrentForecast(events);   // chains off the prior day's forecastAfter
  const payload = rollWeatherForDate(date, forecastBefore);
  emitWeatherCommitted(file, payload);                    // typed now (was an `any` placeholder)
  return payload;
}
```

Re-reading events inside `autoCommitWeather` keeps the forecast chain correct across days
(the orchestrator already re-reads elsewhere). No schema changes and no new event kind —
`weather_committed` already exists and is exactly what `selectCurrentWeather` /
`selectCurrentForecast` read.

**Fidelity note:** auto-accept can't prompt the GM to hand-pick descriptors or override the
category the way interactive `weather use` / `weather set` do; it takes the roll as-is. That
is the intended trade for unattended multi-day travel.

**Architecture:** importing `handlers/weather/helpers.ts` from fast-travel code is *legal*
(`no-cross-command-imports` only blocks scribe↔weave, not intra-scribe imports). Optional
polish: relocate those pure helpers to `lib/weather/` (only two importers to update —
`weather/roll.ts`, `weather/set.ts`). Not required for this change.

### Files to modify

| File | Change |
|------|--------|
| `lib/core/fast-travel-runner.ts` | No behavior change to the per-day loop. Distinguish the two no-capacity reasons in the result (e.g. keep `paused_no_capacity` but ensure `finalSegments`/`currentLegIndex` are set even on the zero-progress case) so the orchestrator can detect a leg that never fits. |
| `lib/core/drive-journey.ts` (new) | The loop above. Owns `ctx.calendar` + day emitters. Also auto-commits weather per day (incl. day 1) via `autoCommitWeather` and emits a per-day `log()` line. |
| `lib/weather/roll-weather-for-date.ts` (new) | Pure `rollWeatherForDate(date, forecastBefore) → WeatherCommittedEventPayload`, lifted from `weather roll`'s compute (no `ctx`/draft, take the roll as-is). Reuses `handlers/weather/helpers.ts`. |
| `lib/emitters/emit-weather-committed.ts` | Replace the `any` placeholder with a typed emit of `WeatherCommittedEventPayload` (or call `appendEvent` directly). Now actively used by auto-weather. |
| `lib/emitters/emit-fast-travel-events.ts` | Currently only dispatches `move` / `time_log` / `note`. The orchestrator emits day boundaries + weather directly via `emitDayEnd`/`emitDayStart`/`emitWeatherCommitted`, so this can stay as-is — OR add those cases if we prefer the runner to return them in `events`. Pick one; orchestrator-emits is simpler and keeps the runner pure. |
| `handlers/fast-travel/plan-and-execute.ts` | Replace the inline `runFastTravel` + `emitFastTravelEvents` + `handleFastTravelResult` block with `driveJourney(...)` then `handleFastTravelResult`. |
| `handlers/fast-travel/resume.ts` | Same: call `driveJourney(...)` instead of a single `runFastTravel`. |
| `lib/processors/handle-fast-travel-result.ts` | Add an `error_no_progress` branch (clear message: leg X→Y needs N segments but a full day's daylight is only M; abort and keep/clear plan). `completed` and `paused_encounter` branches unchanged. |
| `lib/core/fast-travel-runner.spec.ts` | Existing tests asserting the old "pause at day boundary" behavior move to the orchestrator. Add `drive-journey.spec.ts`. |

### New tests

- `drive-journey`: multi-day trip completes (e.g. a route that needs ~2.5 winter days).
- Envelope recompute: a trip crossing a season boundary (e.g. `Hibernis`→`Vernalis`,
  winter 9h → spring 12h) uses the larger daylight cap on the later day.
- Hard stop: a single leg longer than a full day's daylight returns `error_no_progress`,
  emits no day_start storm of events, surfaces a clear message.
- Auto-weather: each advanced day emits a `weather_committed` event; day 1 also gets one
  when the GM committed no weather (and is left untouched when they did). Mock `rollDice`.
- Weather doubler: on a day whose auto-rolled weather `slowsTravel`, legs that day consume
  the doubled segment count (asserts `state.weather` is threaded into the next day).

### Verification

```bash
npm run typecheck
cd apps/cli && npm run test:scribe
```
Manual smoke (scribe REPL): `day start`, `move` to a start hex, `fast <far-dest> normal` →
party arrives, multiple `day_start`/`day_end` pairs in the log, time tracked per day.

### Commit point
"Auto-advance days in fast travel; recompute activity envelope per day"

---

## Phase 2 — Per-hex encounter chance from hex → region

**Goal:** Encounter occurrence uses the d20 threshold from the hex being entered, falling
back to the hex's region when the hex doesn't set one.

### Files to add / modify

| File | Change |
|------|--------|
| `packages/data/src/repo-paths.ts` | Add `REGIONS: () => resolveDataPath('regions')`. |
| `apps/cli/src/services/regions.service/build-hex-region-index.ts` (new) | Mirror `services/hexes.service/build-hex-file-index.ts`: glob `REGIONS()/*.yml,*.yaml`, validate with `RegionSchema`, iterate `region.hexes`, return `Record<normalizedHexId, { regionId: string; encounterChance: number }>`. |
| `apps/cli/src/services/regions.service/index.ts` (new) | Barrel export. |
| `lib/encounters/resolve-encounter-chance.ts` (new) | `resolveEncounterChance(hexId): number`. Read the hex YAML's `encounterChance` (the hex is already loaded for terrain in `lib/hex-data.ts` — reuse that load), else the region index value, else a documented default (e.g. `0` = never, with a `warn`). Returns the d20 threshold. |
| `lib/encounters/roll-encounter-occurs.ts` | Change signature to `rollEncounterOccurs(threshold: number)`: `return rollDice('1d20') <= threshold` (replaces the hardcoded `=== 1`). |
| `lib/encounters/roll-encounter-occurs.spec.ts` | Update for the threshold parameter (boundary cases: roll == threshold triggers; threshold 0 never; threshold 20 always). |

### Threading the threshold (keep the runner pure)

The runner already receives encounter *data* via state and does the dice rolling itself.
Mirror that: the handler resolves chances for the route up front and injects them.

| File | Change |
|------|--------|
| `lib/core/fast-travel-runner.ts` (`FastTravelState`) | Add `encounterChances: Record<string, number>` (normalized hexId → threshold). The runner calls `rollEncounterOccurs(state.encounterChances[destHex] ?? 0)` per hex. |
| `handlers/fast-travel/plan-and-execute.ts` + `resume.ts` | Build `encounterChances` for every hex in `route` via `resolveEncounterChance` and pass it in state. |

### Verification

```bash
cd apps/cli && npm run test:scribe
```
Heads-up to note in the PR: region defaults like `8` mean ~40% per hex vs today's 5% — far
more frequent encounters on multi-hex trips (the point of Phase 3's manual-roll pause).

### Commit point
"Read fast-travel encounter chance from hex, falling back to region"

---

## Phase 3 — Prompt-to-roll on encounter + tolerant resume

**Goal:** When occurrence triggers, fast travel pauses at that hex and prompts the GM to
roll the encounter manually (no auto-picked monster). After the GM resolves it (appending
events), `fast resume` continues without rejecting the plan.

### Prompt-to-roll

| File | Change |
|------|--------|
| `lib/encounters/make-encounter-note.ts` | Stop auto-rolling category/entry. The runner now decides occurrence via `rollEncounterOccurs(threshold)`; on a hit, emit a prompt note instead, e.g. `Encounter check triggered entering ${hex} (rolled ≤ ${threshold}). Roll on the region table, resolve it, then \`fast resume\`.` This drops fast travel's dependency on the global `default-encounter-table.yaml`. |
| **Prune dead code** | Fast travel was the *only* caller of `rollEncounterType`, `rollEncounterEntry`, and `loadEncounterTable` (verified by grep). Once the above lands they have zero callers, so delete them, their barrel exports in `lib/encounters/index.ts`, the `default-encounter-table.yaml` wiring, and the stray `export { loadEncounterTable }` in `handle-fast-travel-result.ts:15`. (`rollEncounterOccurs` stays — Phase 2 still uses it.) |
| `lib/core/fast-travel-runner.ts` | Where it currently calls `makeEncounterNote(destHex, table)`, branch on `rollEncounterOccurs(threshold)` and build the prompt note. `encounterTable` can be removed from `FastTravelState` (and from the two handlers + `loadEncounterTable` wiring) since fast travel no longer auto-rolls the encounter. |
| `lib/core/fast-travel-runner.spec.ts` | Update encounter tests: assert the pause + prompt-note text, no category/entry roll. |

### Tolerant resume (replaces the hash gate)

The party pauses **before** entering `route[legIndex]`, so at resume it should still be at
the previous hex (`route[legIndex - 1]`, or `startHex` when `legIndex === 0`). Resume
already recomputes segments/date/envelope from current events — only the gate changes.

| File | Change |
|------|--------|
| `lib/core/fast-travel-plan.ts` | Drop the exact-hash machinery: remove `lastSeq` / `lastHash` / `currentHash` (and `hasWeatherForToday` if unused) from `FastTravelPlanSchema`, the `FastTravelPlan` type, `CreatePlanArgs`, and `createPlan`. Replace `verifyPlanIntegrity` with `verifyPlanPosition(plan, currentHex)` → `currentHex === expectedHexBefore(plan.route, plan.legIndex)`. |
| `lib/types/fast-travel.ts` | Update `FastTravelPlan` type accordingly. |
| `handlers/fast-travel/resume.ts` | Replace the `currentHash !== plan.currentHash` block (lines ~36-42) with `verifyPlanPosition`. On mismatch: `error('Party has moved since the encounter pause; the plan no longer lines up. Use \`fast abort\` to clear it.')`. Then `driveJourney(...)` (from Phase 1) so resume also auto-advances days. |
| `lib/processors/handle-fast-travel-result.ts` | Remove the hash recompute on pause (`computeSessionHash`); persist only `legIndex` + day progress (or nothing, since resume recomputes from events). |
| `services/projectors.service/compute-session-hash.ts` | Now unused by fast travel — leave if referenced elsewhere; remove its fast-travel import. |

### Verification

```bash
npm run typecheck
cd apps/cli && npm run test:scribe
```
Manual smoke: force an encounter (temporarily set a high `encounterChance`), confirm fast
travel pauses with the prompt, append a `note`/combat events, run `fast resume` → it
continues from the right hex across the manual edits.

### Commit point
"Prompt GM to roll fast-travel encounters; tolerant resume after pause"

---

## Phase 4 — Polish

**Goal:** Fix display/help drift and prune dead state.

| File | Change |
|------|--------|
| `handlers/fast-travel/status.ts` | The activity line reads `/ 16 (… / 8h)` but the enforced exhaustion cap is 24 segments / 12h (`execute-leg.ts:37`). Fix the denominator; show the day's daylight envelope too. |
| `apps/cli/src/commands/scribe/help-text.ts` | Update the `fast` help to reflect one-command multi-day travel, per-day auto-weather, and the encounter pause/resume flow. |

### Commit point
"Fast travel status/help polish"

---

## Edge cases

- **Single leg longer than a full day's daylight** → `error_no_progress`, clear message, no
  infinite loop (Phase 1 zero-progress guard).
- **Encounter on the first leg** (`legIndex === 0`) → expected resume hex is `startHex`.
- **Empty route / already at destination** → existing "no route" / immediate-complete paths.
- **No open day / no current date** → keep the existing `day start` / `date set` errors.
- **Weather across the trip** → auto-rolled and committed per day, day 1 included when the
  GM committed nothing (Phase 1 auto-weather). A bad-weather travel doubler therefore applies
  on any day it's rolled. The forecast chains day-to-day via `selectCurrentForecast`. If the
  GM *did* commit day-1 weather, it's left untouched. The daylight envelope is independent of
  weather (season-derived) and updates per day regardless.
- **Multiple encounters across a multi-day trip** → each pauses; `fast resume` recomputes
  state from events each time, so successive encounters work.
- **Party moves during encounter resolution** → tolerant resume detects the position
  mismatch and tells the GM to `fast abort` rather than silently continuing from the wrong
  hex.
- **Hex not listed in any region's `hexes`** → `resolveEncounterChance` falls back to the
  default threshold and warns (practically every hex belongs to a region).
- **Exhaustion cap is a constant** (12h) and intentionally does NOT vary by date; only the
  daylight cap is date/season-derived.

## Open follow-ups (out of scope)

- Pre-execution preview ("~3 days, 2 nights to <dest>") before committing moves.
- Optionally surfacing the region's encounter table inline in the pause prompt for
  convenience (we have `region.encounters` / `encounterIds`).
- Letting the GM hand-pick descriptors / override the category on auto-rolled days (today
  auto-weather takes the roll as-is; interactive `weather use` / `weather set` still exist
  for manual play).
</content>
</invoke>

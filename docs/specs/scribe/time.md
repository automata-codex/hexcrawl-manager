# `time` command — specification

## Purpose

Record a block of in-game **active time** for the current open day, allocating it between the **daylight envelope** and **night** based on remaining daylight. Internally, time is tracked in **segments** of `STEP_HOURS` hours.

## Synopsis

```
time <hours> [<note>]
```

* `<hours>`: positive number of hours to log. May be fractional; will be **ceiled** to the nearest `STEP_HOURS`.
* `<note>` (optional, positional): free-text annotation for the entry (e.g., reason, activity). If omitted or empty/whitespace, no note is stored.

> No `--note` flag is required or supported for this command.

## Preconditions

* There must be an **open day** (`day_start` without a `day_end`).

  * If none: print `❌ No open day. Start one with: day start [date]` and return non-zero.

## Constants & helpers (existing)

* `STEP_HOURS: number` — segment size (currently **0.5h**).
* `EXHAUSTION_HOURS: number` — daily “active” budget (warning only).
* `hoursToSegmentsCeil(h) -> int`
* `segmentsToHours(s) -> number`
* `findOpenDay(events) -> { open: boolean; lastStartIdx?: number }`
* `daylightSegmentsSinceStart(events, lastStartIdx) -> int`
* `activeSegmentsSinceStart(events, lastStartIdx) -> int`
* `appendEvent(file, kind, payload)` / `readEvents(file)`

## Daylight envelope

* Read `daylightCap` (hours) from current day’s `day_start.payload.daylightCap`. Default **9h** if absent.
* Compute `capSegments = round(daylightCap / STEP_HOURS)`.
* Let `usedDaylight = daylightSegmentsSinceStart(...)`.
* Split the new entry (in segments):

  * `daylightSegments = min(newSegments, max(0, capSegments - usedDaylight))`
  * `nightSegments = newSegments - daylightSegments`

## Rounding rules

* Convert `<hours>` → `segments = hoursToSegmentsCeil(hours)`.
* `roundedHours = segmentsToHours(segments)`.
* If `roundedHours !== hours`, print:

  ```
  ⚠️ Rounded <hours>h → <roundedHours>h (<STEP_HOURS>h steps).
  ```

## Event model

Write **one** `time_log` event per invocation with both split values:

```json
{
  "kind": "time_log",
  "payload": {
    "segments": <int>,             // total segments logged by this call
    "daylightSegments": <int>,     // allocated to daylight
    "nightSegments": <int>,        // allocated to night
    "phase": "daylight" | "night", // primary phase for UX (see below)
    "note": "<optional string>"    // omit if not provided or empty
  }
}
```

* `phase`:

  * `"daylight"` if `nightSegments === 0`
  * `"night"` if `daylightSegments === 0`
  * For mixed splits, use `"daylight"` (cosmetic only; split fields are canonical).

## Output

After writing the event, print:

* Daylight only:

  ```
  ⏱️ Logged: <roundedHours>h — daylight
  ```
* Night only:

  ```
  ⏱️ Logged: <roundedHours>h — 🌙 night
  ```
* Mixed:

  ```
  ⏱️ Logged: <roundedHours>h — <daylightH>h daylight, <nightH>h 🌙 night
  ```

Where `daylightH = segmentsToHours(daylightSegments)` and `nightH = segmentsToHours(nightSegments)`.

### Exhaustion warning (informational)

* `EXHAUSTION_SEGMENTS = round(EXHAUSTION_HOURS / STEP_HOURS)`.
* `activeAfter = activeSegmentsSinceStart(...) + segments`.
* If `activeAfter > EXHAUSTION_SEGMENTS`, append:

  ```
  ⚠️ Exceeded <EXHAUSTION_HOURS>h exhaustion threshold (<segmentsToHours(activeAfter).toFixed(1)>h total)
  ```

> No extra event; this is a UI hint only.

## Validation & errors

* If `<hours> <= 0` or not finite: print `usage: time <hours>` and return non-zero.
* `<note>` handling:

  * The command treats **everything after `<hours>`** on the line as the note (do not require quotes; accept them if present).
  * Trim leading/trailing whitespace; if empty after trim, **omit** the field from the event.

## Examples

```
# STEP_HOURS = 0.5h; daylightCap = 9h; 6h already used today

$ time 1
⏱️ Logged: 1h — daylight

$ time 4.1 move to hex p13
⚠️ Rounded 4.1h → 4.5h (0.5h steps).
⏱️ Logged: 4.5h — 3h daylight, 1.5h 🌙 night

$ time 2 "forage + map cleanup"
⏱️ Logged: 2h — 🌙 night
```

Split example event:

```json
{"kind":"time_log","payload":{
  "segments":9,
  "daylightSegments":6,
  "nightSegments":3,
  "phase":"daylight",
  "note":"move to hex p13"
}}
```

## Edge cases & notes

* **Large entries** (e.g., `time 48`) are permitted; they’ll allocate mostly to night and may trigger the exhaustion warning. Correction is via the **global undo**.
* All computations must reference `STEP_HOURS`; do **not** assume historical values.

## Implementation checklist

1. Parse `<hours>` (arg\[0]) and optional **positional** `<note>` (join remaining args with spaces).
2. Guard that a day is open.
3. Convert hours → segments; emit rounding message if applicable.
4. Read daylight cap (default 9h) and compute daylight/night split in segments.
5. Build and append `time_log` event per the **Event model** (omit `note` if empty).
6. Compute `activeAfter` and print final UX line (+ optional exhaustion suffix).

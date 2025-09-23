# Event Reference

This document defines the canonical event kinds and payload schemas emitted by `scribe`.
These events are consumed by `finalize` and `weave` to produce session outputs and apply changes to game state.

## Session Lifecycle Events

### `session_start`
- **Emitted by:** `start.ts`
- **Payload:**
  - `status`: `"in-progress"`
  - `id`: Session id
  - `startHex`: Starting hex id

### `session_end`
- **Emitted by:** `finalize.ts` (via `finalizeSession` in `session.ts`)
- **Payload:**
  - `status`: Always `"final"`

### `session_pause`
- **Proposed**
- **Payload:**
  - `status`: `"paused"`
  - `id`: Session id

### `session_continue`
- **Proposed**
- **Payload:**
  - `status`: `"in-progress"`
  - `id`: Session id
  - `startHex`: Current hex id
  - `party`: Current party ids
  - `calendarDate`: Current in-world date

## Time & Calendar Events

### `date_set`
- **Emitted by:** `date.ts`
- **Payload:**
  - `calendarDate`: The new canonical date

### `day_start`
- **Emitted by:** `day.ts`
- **Payload:**
  - `calendarDate`: The canonical date for the day
  - `season`: Season string
  - `daylightCap`: Number of daylight hours

### `day_end`
- **Emitted by:** `day.ts`
- **Payload:**
  - `summary`: Object with:
    - `active`: Number (hours active)
    - `daylight`: Number (hours in daylight)
    - `night`: Number (hours at night)

### `time_log`
- **Emitted by:** `time.ts`
- **Payload:**
  - `segments`: Number of time segments logged

## Travel & Navigation Events

### `move`
- **Emitted by:** `move.ts`
- **Payload:**
  - `from`: Previous hex id (nullable)
  - `to`: Destination hex id
  - `pace`: `"slow"`, `"normal"`, or `"fast"`

### `trail`
- **Emitted by:** `trail.ts`
- **Payload:**
  - `from`: Source hex id
  - `to`: Destination hex id
  - `marked`: boolean (true if trail is marked)

### `dead_reckoning`
- **Emitted by:** `deadReckoning.ts`
- **Payload:**
  - `outcome`: `"success"` or `"fail"`

### `lost`
- **Emitted by:** `deadReckoning.ts`, `move.ts`
- **Payload:**
  - `state`: `"on"` or `"off"`
  - `method` (optional): `"dead-reckoning"`
  - `reason` (optional): `"nav-fail"`

### `scout`
- **Emitted by:** `scout.ts`
- **Payload:**
  - `from`: Current hex id
  - `target`: Target hex id
  - `reveal`: Object with:
    - `terrain`: boolean
    - `vegetation`: boolean
    - `landmark`: boolean

## Party & Notes

### `party_set`
- **Emitted by:** `party.ts`
- **Payload:**
  - `ids`: Array of character ids

### `note`
- **Emitted by:** `note.ts`
- **Payload:**
  - `text`: Note content
  - `scope`: `"session"`

## Weather

### `weather_committed`
- **Emitted by:** `weather/commit.ts`
- **Payload:**
  - `date`: Date of the weather event
  - `season`: Season string
  - `roll2d6`: Dice roll result
  - `forecastBefore`: Previous forecast value
  - `total`: Weather total
  - `category`: Weather category
  - `detail`: Weather detail (nullable)
  - `descriptors`: Array of descriptor strings (optional)
  - `forecastAfter`: Clamped forecast modifier

## Notes

- **Proposed events** (`session_pause`, `session_continue`) are not implemented in the main `scribe` interface, but they are inserted as needed by the `finalize` command.
- All events are written to session logs (`.jsonl`) and later processed by `finalize` and `weave`.
- Payloads are considered the canonical schema; consumers must not add or drop fields silently.

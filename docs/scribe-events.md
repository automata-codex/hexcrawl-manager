Here is documentation for the event kinds and their payloads emitted by the scribe command handlers in this project:

### Event Kinds and Payloads

#### `date_set`
- **Emitted by:** `date.ts`
- **Payload:**
  - `calendarDate`: The new canonical date

#### `day_end`
- **Emitted by:** `day.ts`
- **Payload:**
  - `summary`: Object with:
    - `active`: Number (hours active)
    - `daylight`: Number (hours in daylight)
    - `night`: Number (hours at night)

#### `day_start`
- **Emitted by:** `day.ts`
- **Payload:**
  - `calendarDate`: The canonical date for the day
  - `season`: Season string
  - `daylightCap`: Number of daylight hours

#### `dead_reckoning`
- **Emitted by:** `deadReckoning.ts`
- **Payload:**
  - `outcome`: `"success"` or `"fail"`

#### `lost`
- **Emitted by:** `deadReckoning.ts`, `move.ts`
- **Payload:**
  - `state`: `"on"` or `"off"`
  - `method` (optional): `"dead-reckoning"`
  - `reason` (optional): `"nav-fail"`

#### `move`
- **Emitted by:** `move.ts`
- **Payload:**
  - `from`: Previous hex id (nullable)
  - `to`: Destination hex id
  - `pace`: `"slow"`, `"normal"`, or `"fast"`

#### `note`
- **Emitted by:** `note.ts`
- **Payload:**
  - `text`: Note content
  - `scope`: `"session"`

#### `party_set`
- **Emitted by:** `party.ts`
- **Payload:**
  - `ids`: Array of character ids

#### `scout`
- **Emitted by:** `scout.ts`
- **Payload:**
  - `from`: Current hex id
  - `target`: Target hex id
  - `reveal`: Object with:
    - `terrain`: boolean
    - `vegetation`: boolean
    - `landmark`: boolean

#### `session_end`
- **Emitted by:** `finalize.ts` (via `finalizeSession` in `session.ts`)
- **Payload:**
  - `status`: Always `'final'`

#### `session_start`
- **Emitted by:** `start.ts`
- **Payload:**
  - `status`: Session status (e.g., 'in-progress')
  - `id`: Session id
  - `startHex`: Starting hex id

#### `time_log`
- **Emitted by:** `time.ts`
- **Payload:**
  - `segments`: Number of time segments logged

#### `trail`
- **Emitted by:** `trail.ts`
- **Payload:**
  - `from`: Source hex id
  - `to`: Destination hex id
  - `marked`: boolean (true if trail is marked)

#### `weather_committed`
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

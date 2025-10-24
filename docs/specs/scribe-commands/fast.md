# `scribe fast` — Command Spec (v1.0)

## Overview

Automate overland travel **along marked trails only**, emitting the same events you would type by hand (`move`, `time_log`, `day_start`, `weather_committed`, `day_end`, `note` for encounters). Planning finds the **fewest-trails** route (no terrain costs in planning). Execution runs **leg-by-leg**, respecting daylight and daily activity caps, and pausing for encounters.

---

## Commands (REPL)

* `fast <DEST_HEX> <PACE>`

  * Plan a **trails-only** route from the current hex to `DEST_HEX` and execute it leg by leg.
  * `PACE ∈ { slow | normal | fast }` (this is travel pace, not “fast travel” speed).

* `fast resume`

  * Continue a paused plan from its last saved point.

* `fast status`

  * Show active plan progress and today’s counters.

* `fast abort`

  * Delete the active plan file (no log edits).

---

## Preconditions

* There is an **open/active day**: at least one `day_start` without a corresponding `day_end`.

  * If not present → **error:** “Start a day with `day_start` before using fast travel.”

* The session has a known **current hex** (derived by projector).

  * If unknown → error.

* `DEST_HEX` is valid and different from current hex.

  * If equal → print “Already at <DEST_HEX>” (no-op).

---

## Planning

* **Graph:** Build an **undirected** trail graph from the trail YAML (include **all trails**).

  * Keys like `p13-q12` imply edges between normalized IDs `P13` and `Q12`.

* **Shortest path:** **BFS** (fewest edges).

  * **Tie-breaker** when enqueueing neighbors (optional but stable):

    1. `permanent` (true before false)
    2. `usedThisSeason` (true before false)
    3. higher `streak`

* **No route:** If BFS returns null → **error:** “No marked-trail route from <A> to <B>.”

---

## Execution Model (per leg A→B)

### Per-leg duration (segments)

* Base by `PACE` (segments are ½h):
  * `slow = 6` (3h)
  * `normal = 4` (2h)
  * `fast = 3` (1.5h)

* Apply one **×2 doubler** if **either**:
  * destination hex is **difficult**, or
  * today’s weather is **Unpleasant / Inclement / Extreme**.
    If both, still only **×2**.

### Daily caps

* **Active cap:** `24` segments (**12h**) per day.
* **Daylight cap:** `daylightCapHours * 2` (segments) from today’s `day_start`.

### Capacity check (before emitting a move)

If `activeSegmentsToday + legSegments > 24` **or** `daylightSegmentsLeft < legSegments`:

1. **End day:**
   * `day_end { summary: { active, daylight, night } }`
   * Summary fields are **hours** (segments ÷ 2).

2. **Start next day:**
   * `day_start { calendarDate: <next>, season, daylightCap }`
   * `weather_committed` (today’s weather)

3. Reset counters and **re-evaluate the same leg**.

If a leg ends **exactly** on a cap, allow it (no exhaustion risk until you exceed).

### Emitted events for a fitting leg

1. `move { from: A, to: B, pace }`
2. `time_log`:

  * `segments = legSegments`
  * Allocate daylight first:

    * `daylightSegments = min(legSegments, daylightSegmentsLeft)`
    * `nightSegments = legSegments - daylightSegments`
    * `phase = (nightSegments > 0 ? 'night' : 'daylight')`
  * Update counters:

    * `activeSegmentsToday += segments`
    * `daylightSegmentsLeft -= daylightSegments`

### Encounters (on trails)

* Trails skip navigation/lost checks, but **encounters still occur**.
* Trigger sequence (resolved by helper; see below):

  1. roll presence, 2) roll type table, 3) roll entry
* On a hit:

  * Emit `note { text: "Encounter entering <B>: <one-liner>", scope: 'day' }`
  * **Pause** the plan (persist progress). GM resolves it manually; then `fast resume`.

---

## Sidecar (Pause/Resume Persistence)

* File path: `data/fast-travel/session-<ID>.yaml`

* Shape (store **segments**; summaries in hours happen only in `day_end`):

  ```yaml
  groupId: "b6a3f7d2-9e9a-4a4e-9d8a-3b8b9a2c5e8f"
  sessionId: 42
  startHex: P12
  destHex: U17
  pace: normal
  route: [P12, P13, Q13, R14, S14, T15, U15, U16, V17, U17]
  legIndex: 0                 # next leg: route[legIndex] -> route[legIndex+1]
  activeSegmentsToday: 0      # cap 24
  daylightSegmentsLeft: 24    # daylightCapHours * 2
  hasWeatherForToday: true
  lastSeq: 1234               # integrity – last event seq written by runner
  lastHash: "sha256:…"        # integrity – hash of recent log tail
  ```

* **Resume integrity:** Verify `lastSeq/lastHash` against the current log tail; if different → abort with:
  “Log changed since plan was created—please re-run `fast`.”

* **Abort:** Delete file; already-emitted events remain.

---

## Helpers (to implement)

### Time & caps

```ts
export const ACTIVE_CAP_SEGMENTS = 24;
export const BASE_LEG_SEGMENTS = { slow: 6, normal: 4, fast: 3 } as const;

export function toHours(segments: number): number; // segments / 2 (today)
```

### Daylight & calendar

```ts
import type { CampaignDate } from '@skyreach/schemas';

export function getDaylightCapHours(date: CampaignDate): number;
export function getDaylightCapSegments(date: CampaignDate): number; // hours * 2
export function nextCampaignDate(date: CampaignDate): CampaignDate; // +1 day
```

### Hex & weather

```ts
export function isDifficultHex(hexId: string): boolean;

import type { WeatherCommittedEventPayload } from '@skyreach/schemas';
export function isInclement(w: WeatherCommittedEventPayload): boolean;
// true if w.category ∈ {'Unpleasant','Inclement','Extreme'}
```

### Trails graph (planner)

```ts
type TrailInfo = { permanent: boolean; streak: number; usedThisSeason: boolean; };
export type TrailMap = Record<string, TrailInfo>; // "p12-p13": {...}

export function buildTrailGraph(trails: TrailMap): Map<string, string[]>;
// - Undirected
// - Normalize both ends (e.g., "p13-q12" => ("P13","Q12"))
// - Include ALL trails, no filtering

export function bfsTrailPath(
  graph: Map<string, string[]>,
  start: string,
  dest: string,
  neighborScore?: (u: string, v: string) => number // for tie-break
): string[] | null;

// Suggested neighborScore (bigger is better):
// permanent? +1000, usedThisSeason? +100, +streak
```

### Encounters (interface boundary)

```ts
// Choose & roll the correct table (hex > region > default) and return a one-liner.
export function makeEncounterNote(hexId: string): string;

// If you prefer an explicit 3-roll interface:
export function rollEncounterOccurs(hexId: string): boolean;
export function rollEncounterType(hexId: string): string;
export function rollEncounterEntry(type: string, hexId: string): string;
```

### Emitters (thin wrappers around appendEvent)

```ts
// Each returns the written seq number to update lastSeq/lastHash as needed
export function emitDayEnd(activeSeg: number, daylightSeg: number, nightSeg: number): number; // converts to hours in payload
export function emitDayStart(date: CampaignDate, season: string, daylightCapHours: number): number;
export function emitWeatherCommitted(date: CampaignDate): { seq: number; payload: WeatherCommittedEventPayload; };
export function emitMove(from: string, to: string, pace: 'slow'|'normal'|'fast'): number;
export function emitTimeLog(totalSeg: number, daylightSeg: number, nightSeg: number, phase: 'daylight'|'night'): number;
export function emitNote(text: string, scope: 'day'|'session'): number;
```

---

## Status & UX

* **Preview before execute:**

  * route (e.g., `P12 → P13 → Q13 → … → U17`)
  * legs count
  * best-case total segments (assumes no encounters; all daylight)
  * first expected camp estimate

* **During execution:**

  * print each `move` and `time_log`
  * on auto-camp: `⛺ day cap reached; making camp (active: 12.0h)`
  * on encounter pause: `⚠️ Encounter entering <B>. Resolve, then run: fast resume`

* **`fast status`:**

  * `leg i/n`, next edge `A→B`
  * `active today: X.Yh`, `daylight left: Z.Zh`
  * today’s weather category

---

## Errors

* No open day → “Start a day with `day_start` before using fast travel.”
* Unknown current hex → “Current position is unknown.”
* Invalid/unknown `DEST_HEX` → “Unknown hex: <DEST_HEX>.”
* No trails-only path → “No marked-trail route from <A> to <B>.”
* Resume integrity failure → “Log changed since plan was created—replan required.”

---

## Example (conceptual)

Starting at `P12`, `fast U17 normal`:

1. Preview: `P12 → P13 → Q13 → R14 → S14 → T15 → U15 → U16 → V17 → U17`, 9 legs, best-case 24 segments (12.0h), camp after R14.
2. Execute legs:

  * `move {P12→P13, pace: normal}`
    `time_log {segments: 4, daylight: 4, night: 0, phase: 'daylight'}`
  * …
  * Leg `Q13→R14` is forest+doubler → `segments: 8`; ends **exactly** at 24 seg → allowed.
    `day_end {summary: {active: 12.0, daylight: 12.0, night: 0.0}}`
  * Next day: `day_start {...}` + `weather_committed {...}`
  * Continue remaining legs; on a hit: emit `note "Encounter entering S14: …"` and pause.

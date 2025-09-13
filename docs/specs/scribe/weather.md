# `scribe` Weather — Spec (Proposed + Overrides, auto-propose, manual commit)

## Philosophy

* One-liner at the table: `weather roll` figures out season, rolls 2d6, looks up forecast, classifies into a seasonal band, pulls detail on Inclement+, and shows three descriptors.
* Append-only log: nothing is written until `weather commit`.
* Draft with two layers: **proposed** (mechanics the system computes and that drive tomorrow) and **overrides** (presentation you choose to log for today).
* Forecast continuity: tomorrow’s forecast always uses the **proposed** category’s mapping (unless you decide later to add “core edits” to mechanics).

## CLI (no date args; no history)

* `weather roll` (alias `weather propose`) → create/replace today’s draft in `Context`.
* `weather set <field> <value>` → edit the draft (never writes to log).

  * Core fields: `season`, `roll`, `forecast` (these update **proposed** and recompute).
  * Presentation fields: `category`, `detail`, `desc "<text>"` (these update **overrides** only).
* `weather use <idx[,idx,...]>` → add descriptor(s) by index (1–3) from the suggestions to `overrides`.
* `weather clear descs` → clear chosen descriptors.
* `weather show` → display today’s draft (proposed vs overrides) and today’s committed entry (if any).
* `weather commit` → append event and clear draft.
* `weather abandon` → discard draft.

Optional lightweight nag printed once per process run:

* If no committed weather and no draft for today: `⚠️ No weather yet for today. Run 'weather roll'.`
* If a draft exists but is not committed: `⚠️ Weather draft exists. Run 'weather commit' or 'weather abandon'.`

## Data shapes

### In-memory draft stored on `Context`

```ts
type Season = "spring"|"summer"|"autumn"|"winter";
type WeatherCategory =
  | "Ideal" | "Nice" | "Agreeable" | "Unpleasant"
  | "Inclement" | "Extreme" | "Catastrophic";

type WeatherDraft = {
  date: string; // today (from calendar projector)

  proposed: {
    season: Season;
    roll2d6: number;          // 2..12
    forecastBefore: number;   // from projector (default 0)
    total: number;            // clamp(roll2d6 + forecastBefore, 2..17)
    category: WeatherCategory;// from seasonal bands
    forecastModifier: number; // mapping from category (−1..+5)
    detail?: string;          // auto only if Inclement+
    suggestedDescriptors: string[]; // exactly 3 strings for (season,category)
    effects: {
      travelMultiplier: 0.5|1|2|0;
      navCheck: "normal"|"disadvantage"|null;
      exhaustionOnTravel: boolean;
    };
    seed?: string;            // optional RNG seed
  };

  overrides: {
    category?: WeatherCategory; // your presentation category (optional)
    detail?: string;            // your presentation detail (optional)
    descriptors?: string[];     // your chosen phrases (optional)
  };
};

type Context = {
  // existing fields...
  weatherDraft?: WeatherDraft;
};
```

### Append-only event (JSONL)

* `kind`: `"weather_committed"`
* `payload`:

```json
{
  "date": "YYYY-MM-DD",
  "season": "spring|summer|autumn|winter",

  "roll2d6": 9,
  "forecastBefore": 2,
  "total": 11,

  "category": "Unpleasant",                 // overrides.category ?? proposed.category
  "detail": "Pelting hail",                 // overrides.detail ?? proposed.detail ?? null
  "descriptors": ["sodden trails"],        // optional; omit if none chosen

  "forecastAfter": 2,                       // = proposed.forecastModifier, clamped −1..+5

  "proposed": {                             // snapshot for audit/debug
    "category": "Unpleasant",
    "detail": null,
    "forecastModifier": 2
  },
  "overrides": {                            // only include fields you actually set
    "category": null,
    "detail": "Pelting hail",
    "descriptors": ["sodden trails"]
  }
}
```

Multiple commits for the same date are allowed; the projector uses last-writer-wins for that date.

## Projectors and helpers (signatures and behavior)

* `projectCurrentDate(): string` → in-world date for today.
* `projectCurrentSeason(): Season` → season for today.
* `projectWeatherForToday(): WeatherCommitted | null` → last committed weather for today (memoized).
* `projectCurrentForecast(): number` → `forecastAfter` from the most recent prior committed weather; if none or first day of a new season, return `0`.
* `bandForTotal(season: Season, total: number): WeatherCategory` → classify using the seasonal 2–17 bands (see configuration).
* `detailRoll(season: Season): string` → roll the season’s detail table; only used when category is Inclement+.
* `descriptorsFor(season: Season, cat: WeatherCategory): string[]` → exactly three short phrases.
* `effectsForCategory(cat: WeatherCategory)` → returns effects row for display.
* `forecastModifierForCategory(cat: WeatherCategory): number` → Ideal −1, Nice 0, Agreeable +1, Unpleasant +2, Inclement +3, Extreme +4, Catastrophic +5 (clamped to −1..+5).

## Command algorithms

### `weather roll`

1. `date ← projectCurrentDate()`
2. `season ← projectCurrentSeason()`
3. `roll2d6 ← rng(2d6)` (capture `seed` if supported)
4. `forecastBefore ← projectCurrentForecast()` (default 0)
5. `total ← clamp(roll2d6 + forecastBefore, 2..17)`
6. `category ← bandForTotal(season,total)`
7. `detail ← (category ∈ {Inclement,Extreme,Catastrophic}) ? detailRoll(season) : undefined`
8. `suggested ← descriptorsFor(season,category)`
9. `effects ← effectsForCategory(category)`
10. `forecastModifier ← forecastModifierForCategory(category)`
11. `Context.weatherDraft = { date, proposed:{ season, roll2d6, forecastBefore, total, category, forecastModifier, detail, suggestedDescriptors:suggested, effects }, overrides:{} }`
12. Print a one-line summary and the three numbered descriptors.

### `weather set <field> <value>`

* Core fields (update **proposed**, recompute chain, refresh suggestions/effects):

  * `season <spring|summer|autumn|winter>`
  * `roll <2..12>`
  * `forecast <int>`
* Presentation fields (update **overrides** only):

  * `category <Ideal|...|Catastrophic>`
  * `detail "<text>"`
  * `desc "<text>"` (append to `overrides.descriptors`, de-dupe)
* After core edits: recompute `total`, `category`, `detail?` (Inclement+), `suggestedDescriptors`, `effects`, `forecastModifier`.
* Echo a concise confirmation after each change.

### `weather use <idx[,idx,...]>`

* For each index 1..3, add that suggestion to `overrides.descriptors` (de-dupe).

### `weather clear descs`

* `draft.overrides.descriptors = []`.

### `weather show`

* If a draft exists, print Proposed (season, roll, forecastBefore, total, proposed.category, effects, proposed.detail?) and beneath it any Overrides (only the fields you set). Show the three suggestions line.
* If a committed weather exists for today, print it beneath the draft.

### `weather commit`

Preconditions: a draft exists.

1. Resolve presentation:

  * `finalCategory = overrides.category ?? proposed.category`
  * `finalDetail   = overrides.detail   ?? proposed.detail ?? null`
  * `finalDescs    = overrides.descriptors` (omit if empty/undefined)
2. Compute `forecastAfter = clamp(proposed.forecastModifier, -1, 5)`
3. Append `"weather_committed"` with the payload described above (include small `proposed` and `overrides` snapshots).
4. Clear `Context.weatherDraft`.

### `weather abandon`

* Clear `Context.weatherDraft`.

## Validation

* Clamp `total` to `[2,17]` and `forecastAfter` to `[-1,+5]`.
* `weather roll` always populates a complete `proposed` block.
* `weather commit` requires a draft; if you set `overrides.category` to something that doesn’t match the seasonal band for `proposed.total`, that is allowed. Forecast continuity still uses `proposed.forecastModifier`.

## Effects table (display-only)

| Category     | travelMultiplier | navCheck     | exhaustionOnTravel |
|--------------|------------------|--------------|--------------------|
| Ideal        | 0.5              | normal       | false              |
| Nice         | 1                | normal       | false              |
| Agreeable    | 1                | normal       | false              |
| Unpleasant   | 2                | normal       | false              |
| Inclement    | 2                | disadvantage | false              |
| Extreme      | 2                | disadvantage | true               |
| Catastrophic | 0 (impassable)   | null         | null               |

## Configuration assets to load at runtime

* `config/weather/bands.json` → seasonal bands mapping totals 2–17 to categories.
* `config/weather/details.json` → season detail tables (only used for Inclement+).
* `config/weather/descriptors.json` → three phrases for each season×category.

Use the JSON contents we finalized earlier for these three files.

## Acceptance tests

1. Roll pipeline
  * With no prior weather, `projectCurrentForecast()` returns 0.
  * `weather roll` populates `proposed` completely; detail only appears for Inclement+; prints three suggestions.

2. Banding
  * Table-driven test confirming `bandForTotal` classification for representative totals in each season.

3. Overrides
  * `weather set category Inclement` sets `overrides.category` and does not change `proposed` values.
  * `weather set desc "..."` appends to `overrides.descriptors`; `weather clear descs` empties it.

4. Core edits
  * `weather set roll 6` recomputes `proposed.total`, `proposed.category`, `proposed.detail?`, `proposed.forecastModifier`, suggestions, and effects.

5. Commit
  * Event includes resolved `category/detail/descriptors`, `forecastAfter` from `proposed.forecastModifier`, and the compact `proposed` and `overrides` snapshots.

6. Supersede
  * Two commits for today exist; projector returns the latest.

7. Nag
  * Proper warning appears when missing weather or draft and stops after commit/abandon.

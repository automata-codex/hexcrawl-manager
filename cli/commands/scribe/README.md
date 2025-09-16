# Scribe Main Directory

This directory contains the main logic, constants, and projectors for the Scribe CLI. Below is a summary of each TypeScript file and its exported functions, with their relative paths from the repository root.

---

## completer.ts
- **Path:** `cli/commands/scribe/completer.ts`
- **Exports:**
  - `scribeCompleter(line: string): [string[], string]` — Provides tab-completion suggestions for Scribe CLI commands. Supports party and AP commands, autocompletes character IDs, pillars, and tiers.

---

## constants.ts
- **Path:** `cli/commands/scribe/constants.ts`
- **Exports:**
  - `EXHAUSTION_HOURS` — Number of hours before exhaustion.
  - `HELP_TEXT` — Multiline string describing all Scribe CLI commands and usage.
  - `HEX_RE` — RegExp for valid hex IDs.
  - `PACES` — Array of valid travel paces.
  - `PILLARS` — Array of valid advancement pillars.
  - `STEP_HOURS` — Number of hours per time segment.
  - `TIERS` — Array of valid advancement tiers.
  - `WEATHER_CATEGORIES` — Array of valid weather categories.

---

## projectors.ts
- **Path:** `cli/commands/scribe/projectors.ts`
- **Exports:**
  - `activeSegmentsSinceStart(events: Event[], startIdx: number): number` — Sums all time segments since the last day_start.
  - `daylightSegmentsSinceStart(events: Event[], startIdx: number): number` — Sums daylight time segments since the last day_start.
  - `findOpenDay(events: Event[]): { open: boolean, lastStartIdx: number }` — Finds if a day is open and the last start index.
  - `isDayOpen(events: Event[]): boolean` — Returns true if the current day is open.
  - `isPartyLost(events: Event[]): boolean` — Returns true if the party is currently lost.
  - `lastCalendarDate(events: Event[]): CanonicalDate | null` — Returns the last calendar date from the event log.
  - `selectCurrentHex(events: Event[]): string | null` — Returns the current hex derived from the event log.
  - `selectParty(events: Event[]): string[]` — Returns the latest party list from the event log.
  - `selectCurrentWeather(events: Event[]): WeatherCommitted | null` — Returns the most recent committed weather from the event log.
  - `selectCurrentForecast(events: Event[]): number` — Returns the most recent forecastAfter value from a previous day's weather_committed event.

---

## types.ts
- **Path:** `cli/commands/scribe/types.ts`
- **Exports:**
  - Type definitions for all core Scribe data structures, including `CalendarConfig`, `CanonicalDate`, `Context`, `DescriptorLibrary`, `DetailTables`, `EffectsTable`, `Event`, `ForecastModifierTable`, `LeapRule`, `MonthDef`, `Pace`, `Pillar`, `Season`, `SeasonalBandsTable`, `Tier`, `WeatherCategory`, `WeatherCommitted`, `WeatherDraft`, and `WeatherEffects`.
  - `CalendarError` — Custom error class for calendar-related issues.

---

Each file in this directory provides core logic, constants, or type definitions for the Scribe CLI. See the source code for further details and usage examples.


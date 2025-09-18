# Scribe CLI Documentation

This document provides a comprehensive overview of the Scribe CLI codebase, including its main logic, configuration, utility libraries, and service modules. All paths are relative to the repository root.

## Table of Contents
- [Main Directory](#main-directory)
- [Config Directory](#config-directory)
- [Lib Directory](#lib-directory)
- [Services Directory](#services-directory)

---

# Main Directory

This directory contains the main logic, constants, and projectors for the Scribe CLI. Below is a summary of each TypeScript file and its exported functions.

## completer.ts
- **Path:** `cli/commands/scribe/completer.ts`
- **Exports:**
  - `scribeCompleter(line: string): [string[], string]` — Provides tab-completion suggestions for Scribe CLI commands. Supports party and AP commands, autocompletes character IDs, pillars, and tiers.

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

## types.ts
- **Path:** `cli/commands/scribe/types.ts`
- **Exports:**
  - Type definitions for all core Scribe data structures, including `CalendarConfig`, `CanonicalDate`, `Context`, `DescriptorLibrary`, `DetailTables`, `EffectsTable`, `Event`, `ForecastModifierTable`, `LeapRule`, `MonthDef`, `Pace`, `Pillar`, `Season`, `SeasonalBandsTable`, `Tier`, `WeatherCategory`, `WeatherCommitted`, `WeatherDraft`, and `WeatherEffects`.
  - `CalendarError` — Custom error class for calendar-related issues.

Each file in this directory provides core logic, constants, or type definitions for the Scribe CLI. See the source code for further details and usage examples.

---

# Config Directory

This directory contains configuration files that define the rules, tables, and data for the Scribe weather and calendar system. Each `.config.ts` file exports a constant used throughout the application.

## calendar.config.ts
- **Path:** `cli/commands/scribe/config/calendar.config.ts`
- **Exports:** `CALENDAR_CONFIG: CalendarConfig`
- **Purpose:** Defines the in-game calendar, including:
  - `months`: Array of months (name, days, aliases)
  - `seasonByMonth`: Maps each month to a season
  - `daylightCaps`: Maximum daylight hours per season
  - `displayFormat`: Date display string (informational)
  - `leap`: Leap year rules (every N years, which month, days added)

## descriptor-library.config.ts
- **Path:** `cli/commands/scribe/config/descriptor-library.config.ts`
- **Exports:** `DESCRIPTOR_LIBRARY: DescriptorLibrary`
- **Purpose:** Provides descriptive weather phrases for each season and severity category.
  - Structure: `{ season: { category: string[] } }`
  - Example: `DESCRIPTOR_LIBRARY.spring.ideal` gives ideal spring weather phrases.

## detail-tables.config.ts
- **Path:** `cli/commands/scribe/config/detail-tables.config.ts`
- **Exports:** `DETAIL_TABLES: DetailTables`
- **Purpose:** Random event tables for inclement and worse weather, per season.
  - Structure: `{ season: { die: string, entries: string[] } }`
  - Example: `DETAIL_TABLES.summer.entries` gives possible summer weather events.

## effects-table.config.ts
- **Path:** `cli/commands/scribe/config/effects-table.config.ts`
- **Exports:** `EFFECTS_TABLE: EffectsTable`
- **Purpose:** Maps weather categories to mechanical effects on travel, navigation, and exhaustion.
  - Structure: `{ category: { travelMultiplier: number, navCheck: string, exhaustionOnTravel: boolean } }`

## forecast-modifier.config.ts
- **Path:** `cli/commands/scribe/config/forecast-modifier.config.ts`
- **Exports:** `FORECAST_MODIFIER: ForecastModifierTable`
- **Purpose:** Maps weather categories to numeric modifiers for forecasting.
  - Structure: `{ category: number }`

## seasonal-bands.config.ts
- **Path:** `cli/commands/scribe/config/seasonal-bands.config.ts`
- **Exports:** `SEASONAL_BANDS: SeasonalBandsTable`
- **Purpose:** Maps dice roll ranges to weather categories for each season.
  - Structure: `{ season: { range: [min, max], category: string }[] }`
  - Example: `SEASONAL_BANDS.winter[0]` gives the range and category for the lowest winter roll.

Each config file is intended to be imported and used as a data source for weather, calendar, and travel logic in the Scribe system. See the type definitions in `../types` for details on each structure.

---

# Lib Directory

This directory contains utility and helper modules used throughout the Scribe CLI. Below is a summary of each file and its exported functions.

## tokenize.ts
- **Path:** `cli/commands/scribe/lib/tokenize.ts`
- **Exports:**
  - `tokenize(s: string): string[]` — Splits a string into arguments, supporting quoted substrings (e.g., `"party rests here"` is one arg).

## date.ts
- **Path:** `cli/commands/scribe/lib/date.ts`
- **Exports:**
  - `datesEqual(a: CanonicalDate | null, b: CanonicalDate | null): boolean` — Returns true if two CanonicalDate objects represent the same date.
  - `getSeasonForDate(date: CanonicalDate): Season` — Returns the season for a given CanonicalDate, using the calendar config.

## day.ts
- **Path:** `cli/commands/scribe/lib/day.ts`
- **Exports:**
  - `hoursToSegmentsCeil(hours: number): number` — Converts hours to the number of time segments, rounding up.
  - `segmentsToHours(segments: number): number` — Converts a number of segments to hours.

## env.ts
- **Path:** `cli/commands/scribe/lib/env.ts`
- **Exports:**
  - `detectDevMode(args: string[]): boolean` — Returns true if the CLI is running in development mode (via `--dev` flag or `SKYREACH_DEV` environment variable).

## guards.ts
- **Path:** `cli/commands/scribe/lib/guards.ts`
- **Exports:**
  - `requireCurrentHex(ctx: Context): boolean` — Checks if the current hex is set in the session; warns and returns false if not.
  - `requireFile(ctx: Context): boolean` — Checks if a session file is set; warns and returns false if not.
  - `requireSession(ctx: Context): boolean` — Checks if a session ID is set; warns and returns false if not.

## jsonl.ts
- **Path:** `cli/commands/scribe/lib/jsonl.ts`
- **Exports:**
  - `readJsonl(p: string): Event[]` — Reads a JSONL file and returns an array of Event objects.
  - `writeJsonl(p: string, records: Event[])` — Writes an array of Event objects to a JSONL file.
  - `appendJsonl(p: string, record: Event)` — Appends a single Event object to a JSONL file.

## math.ts
- **Path:** `cli/commands/scribe/lib/math.ts`
- **Exports:**
  - `clamp(val: number, min: number, max: number): number` — Restricts a number to a given range.
  - `rollDice(notation: string): number` — Parses dice notation (e.g., `2d6+1`) and returns a random roll result using secure RNG.

## report.ts
- **Path:** `cli/commands/scribe/lib/report.ts`
- **Exports:**
  - `error(message: string)` — Prints an error message to stderr.
  - `info(message: string)` — Prints an informational message to stdout.
  - `usage(message: string)` — Prints a usage/help message to stdout.
  - `warn(message: string)` — Prints a warning message to stdout.

Each file in this directory provides reusable logic for the Scribe CLI. See the source code for further details and type definitions.

---

# Services Directory

This directory contains service modules that provide core logic and data access for the Scribe CLI. Below is a summary of each file and its exported classes or functions.

## calendar.ts
- **Path:** `cli/commands/scribe/services/calendar.ts`
- **Exports:**
  - `CalendarService` (class)
    - Provides calendar logic based on a `CalendarConfig`.
    - **Constructor:** `new CalendarService(config: CalendarConfig)`
    - **Methods:**
      - `compare(a: CanonicalDate, b: CanonicalDate): number` — Compares two dates, returns -1, 0, or 1.
      - `daylightCapForDate(date: CanonicalDate): number` — Gets daylight cap for a date.
      - `daylightCapForSeason(season: Season): number` — Gets daylight cap for a season.
      - `daysInMonth(name: string, year: number): number` — Gets number of days in a month (leap-aware).
      - `formatDate(d: CanonicalDate): string` — Formats a date as a string.
      - `incrementDate(d: CanonicalDate, byDays = 1): CanonicalDate` — Adds or subtracts days from a date.
      - `parseDate(input: string, base?: CanonicalDate): CanonicalDate` — Parses a date string, supporting relative and absolute forms.
      - `seasonFor(date: CanonicalDate): Season` — Gets the season for a date.
      - `suggestMonths(prefix: string, limit = 5): string[]` — Suggests month names by prefix.

## character.ts
- **Path:** `cli/commands/scribe/services/character.ts`
- **Exports:**
  - `loadCharacterIds(): string[]` — Loads all character IDs from YAML files in `data/characters`.
  - `getAllCharacterIds(): string[]` — Returns cached character IDs (loads if not cached).
  - `reloadCharacterIds(): string[]` — Reloads and returns all character IDs.

## event-log.ts
- **Path:** `cli/commands/scribe/services/event-log.ts`
- **Exports:**
  - `readEvents(filePath: string): Event[]` — Reads all events from a JSONL file.
  - `writeEvents(filePath: string, events: Event[])` — Writes an array of events to a JSONL file.
  - `appendEvent(filePath: string, kind: string, payload: Record<string, unknown>): Event` — Appends a new event of the given kind and payload.
  - `timeNowISO(): string` — Returns the current time as an ISO string.

## session.ts
- **Path:** `cli/commands/scribe/services/session.ts`
- **Exports:**
  - `inProgressPathFor(id: string): string` — Returns the path to the in-progress file for a session.
  - `sessionsDirPath(): string` — Returns the path to the finalized sessions directory.
  - `finalizeSession(sessionId: string, inProgressFile: string): string` — Finalizes an in-progress file, writes the canonical session file, and returns its path.
  - `findLatestInProgress(): { id: string; path: string } | null` — Finds the latest in-progress session file, or null if none.

Each file in this directory provides reusable logic for the Scribe CLI. See the source code for further details and type definitions.

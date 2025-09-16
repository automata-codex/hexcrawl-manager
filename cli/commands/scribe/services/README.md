# Scribe Services Directory

This directory contains service modules that provide core logic and data access for the Scribe CLI. Below is a summary of each file and its exported classes or functions, with their relative paths from the repository root.

---

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

---

## character.ts
- **Path:** `cli/commands/scribe/services/character.ts`
- **Exports:**
  - `loadCharacterIds(): string[]` — Loads all character IDs from YAML files in `data/characters`.
  - `getAllCharacterIds(): string[]` — Returns cached character IDs (loads if not cached).
  - `reloadCharacterIds(): string[]` — Reloads and returns all character IDs.

---

## event-log.ts
- **Path:** `cli/commands/scribe/services/event-log.ts`
- **Exports:**
  - `readEvents(filePath: string): Event[]` — Reads all events from a JSONL file.
  - `writeEvents(filePath: string, events: Event[])` — Writes an array of events to a JSONL file.
  - `appendEvent(filePath: string, kind: string, payload: Record<string, unknown>): Event` — Appends a new event of the given kind and payload.
  - `timeNowISO(): string` — Returns the current time as an ISO string.

---

## session.ts
- **Path:** `cli/commands/scribe/services/session.ts`
- **Exports:**
  - `inProgressPathFor(id: string): string` — Returns the path to the in-progress file for a session.
  - `sessionsDirPath(): string` — Returns the path to the finalized sessions directory.
  - `finalizeSession(sessionId: string, inProgressFile: string): string` — Finalizes an in-progress file, writes the canonical session file, and returns its path.
  - `findLatestInProgress(): { id: string; path: string } | null` — Finds the latest in-progress session file, or null if none.

---

Each file in this directory provides reusable logic for the Scribe CLI. See the source code for further details and type definitions.


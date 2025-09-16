# Scribe Lib Directory

This directory contains utility and helper modules used throughout the Scribe CLI. Below is a summary of each file and its exported functions, with their relative paths from the repository root.

---

## tokenize.ts
- **Path:** `cli/commands/scribe/lib/tokenize.ts`
- **Exports:**
  - `tokenize(s: string): string[]` — Splits a string into arguments, supporting quoted substrings (e.g., `"party rests here"` is one arg).

---

## date.ts
- **Path:** `cli/commands/scribe/lib/date.ts`
- **Exports:**
  - `datesEqual(a: CanonicalDate | null, b: CanonicalDate | null): boolean` — Returns true if two CanonicalDate objects represent the same date.
  - `getSeasonForDate(date: CanonicalDate): Season` — Returns the season for a given CanonicalDate, using the calendar config.

---

## day.ts
- **Path:** `cli/commands/scribe/lib/day.ts`
- **Exports:**
  - `hoursToSegmentsCeil(hours: number): number` — Converts hours to the number of time segments, rounding up.
  - `segmentsToHours(segments: number): number` — Converts a number of segments to hours.

---

## guards.ts
- **Path:** `cli/commands/scribe/lib/guards.ts`
- **Exports:**
  - `requireCurrentHex(ctx: Context): boolean` — Checks if the current hex is set in the session; warns and returns false if not.
  - `requireFile(ctx: Context): boolean` — Checks if a session file is set; warns and returns false if not.
  - `requireSession(ctx: Context): boolean` — Checks if a session ID is set; warns and returns false if not.

---

## jsonl.ts
- **Path:** `cli/commands/scribe/lib/jsonl.ts`
- **Exports:**
  - `readJsonl(p: string): Event[]` — Reads a JSONL file and returns an array of Event objects.
  - `writeJsonl(p: string, records: Event[])` — Writes an array of Event objects to a JSONL file.
  - `appendJsonl(p: string, record: Event)` — Appends a single Event object to a JSONL file.

---

## math.ts
- **Path:** `cli/commands/scribe/lib/math.ts`
- **Exports:**
  - `clamp(val: number, min: number, max: number): number` — Restricts a number to a given range.
  - `rollDice(notation: string): number` — Parses dice notation (e.g., `2d6+1`) and returns a random roll result using secure RNG.

---

## report.ts
- **Path:** `cli/commands/scribe/lib/report.ts`
- **Exports:**
  - `error(message: string)` — Prints an error message to stderr.
  - `info(message: string)` — Prints an informational message to stdout.
  - `usage(message: string)` — Prints a usage/help message to stdout.
  - `warn(message: string)` — Prints a warning message to stdout.

---

## session-files.ts
- **Path:** `cli/commands/scribe/lib/session-files.ts`
- **Exports:**
  - `ensureLogs()` — Ensures the log directories exist.
  - `inProgressDir()` — Returns the path to the in-progress session logs directory.
  - `inProgressPath(sessionId: string)` — Returns the path to the in-progress file for a session.
  - `logsRoot()` — Returns the root path for session logs.
  - `sessionPath(sessionId: string)` — Returns the path to the finalized session file.
  - `sessionsDir()` — Returns the path to the finalized sessions directory.

---

Each file in this directory provides reusable logic for the Scribe CLI. See the source code for further details and type definitions.


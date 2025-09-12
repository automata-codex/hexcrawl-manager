import type { CalendarService } from './services/calendar.ts';

export type CalendarConfig = {
  daylightCaps: Record<Season, number>;              // { winter:6, spring:9, summer:12, autumn:9 }
  displayFormat?: "D Month YYYY";                    // reserved for future; one format supported today
  leap?: LeapRule;
  months: MonthDef[];                                // ordered list of months
  seasonByMonth: Record<string, Season>;             // map month.name -> season
};

export class CalendarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarError";
  }
}

export type CanonicalDate = {
  year: number;        // e.g., 1511
  month: string;       // must match a configured month name
  day: number;         // 1-based
};

export type Context = {
  sessionId: string | null;
  file: string | null;      // in-progress file path
  calendar: CalendarService;
};

export type Event = {
  seq: number;              // 1..N within the file
  ts: string;               // ISO timestamp
  kind: string;             // "move" | "scout" | ...
  payload: Record<string, unknown>;
};

export type LeapRule = {
  /** Every N years, the leap rule applies (e.g., 4). */
  every: number;
  /** Which month gets extra days in a leap year (e.g., "Umbraeus"). */
  month: string;
  /** How many extra days to add (e.g., 1). */
  addDays: number;
  /**
   * Anchor year offset (optional).
   * If omitted, years divisible by `every` are leap years (…,-8,-4,0,4,8,…).
   * If you want “1512, 1516, …” you can set anchor=0 and it still works;
   * if you needed “1511, 1515, …” you’d set anchor=3, etc.
   */
  anchor?: number;
};

export type MonthDef = {
  name: string;        // canonical name, e.g., "Umbraeus"
  days: number;        // length of the month
  aliases?: string[];  // optional short forms or common misspellings
};

export type Pace = 'fast' | 'normal' | 'slow';

export type Pillar = 'explore' | 'social' | 'combat';

export type Season = "winter" | "spring" | "summer" | "autumn";

export type Tier = 1 | 2 | 3 | 4;

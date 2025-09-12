import {
  type CalendarConfig,
  CalendarError,
  type CanonicalDate,
  type Season,
} from '../types.ts';

export class CalendarService {
  constructor(private readonly config: CalendarConfig) {
    if (!config.months.length) {
      throw new CalendarError("Calendar has no months.");
    }
    for (const m of config.months) {
      if (!m.name || m.days <= 0) {
        throw new CalendarError(`Invalid month: ${JSON.stringify(m)}`);
      }
      if (!config.seasonByMonth[m.name]) {
        throw new CalendarError(`Missing season mapping for "${m.name}".`);
      }
    }
    (["winter","spring","summer","autumn"] as const).forEach(s => {
      if (typeof config.daylightCaps[s] !== "number") {
        throw new CalendarError(`Missing daylight cap for season "${s}".`);
      }
    });
    if (config.leap) {
      const { month, every, addDays } = config.leap;
      if (!this.config.months.find(m => m.name === month)) {
        throw new CalendarError(`Leap month "${month}" is not in months[].`);
      }
      if (every <= 0 || addDays <= 0) {
        throw new CalendarError("Leap rule must have positive 'every' and 'addDays'.");
      }
    }
  }

  compare(a: CanonicalDate, b: CanonicalDate): number {
    if (a.year !== b.year) {
      return a.year < b.year ? -1 : 1;
    }
    const ai = this.monthIndex(a.month), bi = this.monthIndex(b.month);
    if (ai !== bi) {
      return ai < bi ? -1 : 1;
    }
    if (a.day !== b.day) {
      return a.day < b.day ? -1 : 1;
    }
    return 0;
  }

  daylightCapForDate(date: CanonicalDate): number {
    return this.daylightCapForSeason(this.seasonFor(date));
  }

  daylightCapForSeason(season: Season): number {
    const cap = this.config.daylightCaps[season];
    if (typeof cap !== "number") {
      throw new CalendarError(`No cap for season "${season}".`);
    }
    return cap;
  }

  /** Number of days in a given month for a specific year (leap-aware). */
  daysInMonth(name: string, year: number): number {
    const i = this.monthIndex(name);
    if (i === -1) {
      throw new CalendarError(`Unknown month "${name}".`);
    }
    let base = this.config.months[i].days;

    const leap = this.config.leap;
    if (leap && name === leap.month && this.isLeapYear(year, leap.every, leap.anchor)) {
      base += leap.addDays;
    }
    return base;
  }

  formatDate(d: CanonicalDate): string {
    return `${d.day} ${d.month} ${d.year}`;
  }

  incrementDate(d: CanonicalDate, byDays = 1): CanonicalDate {
    this.assertValid(d);
    let { year, month, day } = d;
    let remaining = byDays;

    while (remaining !== 0) {
      if (remaining > 0) {
        const mdays = this.daysInMonth(month, year);
        if (day < mdays) {
          day += 1;
        } else {
          const nm = this.nextMonthName(month);
          if (nm === null) {
            year += 1;
            month = this.firstMonthName();
          }
          else { month = nm; }
          day = 1;
        }
        remaining -= 1;
      } else {
        if (day > 1) {
          day -= 1;
        } else {
          const pm = this.prevMonthName(month);
          if (pm === null) {
            year -= 1;
            month = this.lastMonthName();
          }
          else { month = pm; }
          day = this.daysInMonth(month, year);
        }
        remaining += 1;
      }
    }
    const out: CanonicalDate = { year, month, day };
    this.assertValid(out);
    return out;
  }

  parseDate(input: string, base?: CanonicalDate): CanonicalDate {
    const raw = (input ?? "").trim();
    if (!raw) {
      throw new CalendarError("Empty date string.");
    }

    if (/^[+-]\d+$/.test(raw)) {
      if (!base) {
        throw new CalendarError("Relative date but no base date.");
      }
      return this.incrementDate(base, parseInt(raw, 10));
    }

    const parts = raw.split(/\s+/);
    if (parts.length < 2) {
      throw new CalendarError(`Unrecognized date: "${input}"`);
    }

    const monthIdx = parts.findIndex(p => this.tryResolveMonth(p) !== null);
    if (monthIdx === -1) {
      throw new CalendarError(`No recognizable month in "${input}".`);
    }
    const month = this.resolveMonth(parts[monthIdx]!);

    const others = parts.filter((_, i) => i !== monthIdx);
    const dayTok = others.find(t => /^\d+$/.test(t));
    const day = dayTok ? parseInt(dayTok, 10) : NaN;

    const numericAll = parts.filter(t => /^\d+$/.test(t)).map(Number);
    let year: number | undefined = numericAll.length ? numericAll[numericAll.length - 1] : undefined;
    if (!Number.isFinite(year) || year === day) year = base?.year;

    if (!Number.isFinite(day)) {
      throw new CalendarError(`Missing/invalid day in "${input}".`);
    }
    if (!Number.isFinite(year)) {
      throw new CalendarError(`Missing year in "${input}" and no base.year.`);
    }

    const result: CanonicalDate = { year: year!, month, day: day! };
    this.assertValid(result);
    return result;
  }

  seasonFor(date: CanonicalDate) {
    this.assertValid(date);
    return this.config.seasonByMonth[date.month];
  }

  // REPL helper
  suggestMonths(prefix: string, limit = 5): string[] {
    const p = (prefix ?? "").toLowerCase();
    if (!p) {
      return this.config.months.slice(0, limit).map(m => m.name);
    }
    const coll: { name: string; score: number }[] = [];
    for (const m of this.config.months) {
      if (m.name.toLowerCase().startsWith(p)) {
        coll.push({ name: m.name, score: 1 });
      }
      if (m.aliases?.some(a => a.toLowerCase().startsWith(p))) {
        coll.push({ name: m.name, score: 2 });
      }
    }
    const seen = new Set<string>();
    return coll
      .sort((a, b) => a.score - b.score || this.monthIndex(a.name) - this.monthIndex(b.name))
      .map(x => x.name)
      .filter(n => (seen.has(n) ? false : (seen.add(n), true)))
      .slice(0, limit);
  }

  // ---------- internals ----------

  private assertValid(d: CanonicalDate): void {
    const idx = this.monthIndex(d.month);
    if (idx === -1) {
      throw new CalendarError(`Unknown month "${d.month}".`);
    }
    const mdays = this.daysInMonth(d.month, d.year);
    if (d.day < 1 || d.day > mdays) {
      throw new CalendarError(`${d.month} ${d.year} has ${mdays} days; got ${d.day}.`);
    }
  }

  private firstMonthName(): string {
    return this.config.months[0].name;
  }

  private isLeapYear(year: number, every: number, anchor = 0): boolean {
    // Simple “every N years” rule; no century exceptions unless you add them.
    return ((year - anchor) % every) === 0;
  }

  private lastMonthName(): string {
    return this.config.months[this.config.months.length - 1].name;
  }

  private monthIndex(name: string): number {
    return this.config.months.findIndex(m => m.name === name);
  }

  private nextMonthName(name: string): string | null {
    const i = this.monthIndex(name);
    if (i === -1) {
      throw new CalendarError(`Unknown month "${name}".`);
    }
    return i + 1 < this.config.months.length ? this.config.months[i + 1].name : null;
  }

  private prevMonthName(name: string): string | null {
    const i = this.monthIndex(name);
    if (i === -1) {
      throw new CalendarError(`Unknown month "${name}".`);
    }
    return i - 1 >= 0 ? this.config.months[i - 1].name : null;
  }

  private resolveMonth(token: string): string {
    const r = this.tryResolveMonth(token);
    if (r) {
      return r;
    }
    const suggestions = this.suggestMonths(token, 3);
    const hint = suggestions.length ? ` Did you mean: ${suggestions.join(", ")}?` : "";
    throw new CalendarError(`Unknown month "${token}".${hint}`);
  }

  private tryResolveMonth(token: string): string | null {
    const t = token.toLowerCase();
    for (const m of this.config.months) {
      if (m.name.toLowerCase() === t) {
        return m.name;
      }
      if (m.aliases?.some(a => a.toLowerCase() === t)) {
        return m.name;
      }
    }
    return null;
  }
}

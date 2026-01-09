import { CampaignDate, WEATHER_CATEGORIES } from '@achm/schemas';

export type CalendarConfig = {
  daylightCaps: Record<Season, number>; // { winter:6, spring:9, summer:12, autumn:9 }
  displayFormat?: 'D Month YYYY'; // reserved for future; one format supported today
  leap?: LeapRule;
  months: MonthDef[]; // ordered list of months
  seasonByMonth: Record<string, Season>; // map month.name -> season
};

// Weather descriptors
export type DescriptorLibrary = Record<
  Season,
  Record<WeatherCategory, string[]>
>;

// Extreme weather details
export type DetailTable = { die: string; entries: string[] };

export type DetailTables = Record<Season, DetailTable>;

// Weather effects
export type EffectsTable = Record<WeatherCategory, WeatherEffects>;

export type ForecastModifierTable = Record<WeatherCategory, number>;

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
  name: string; // canonical name, e.g., "Umbraeus"
  days: number; // length of the month
  aliases?: string[]; // optional short forms or common misspellings
};

/** @deprecated Use the value from `@achm/schemas` instead. */
export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

export type SeasonalBand = {
  range: [number, number];
  category: WeatherCategory;
};

export type SeasonalBandsTable = Record<Season, SeasonalBand[]>;

export type WeatherCategory = (typeof WEATHER_CATEGORIES)[number];

export type WeatherCommitted = {
  category: WeatherCategory;
  date: CampaignDate;
  descriptors?: string[];
  detail?: string;
  forecastAfter: number;
  forecastBefore: number;
  roll2d6: number;
  season: Season;
  total: number;
};

export type WeatherDraft = {
  date: CampaignDate;
  overrides: {
    category?: WeatherCategory;
    descriptors?: string[];
    detail?: string;
  };
  proposed: {
    category: WeatherCategory; // from seasonal bands
    detail?: string; // auto only if Inclement+
    effects: WeatherEffects;
    forecastBefore: number; // from projector (default 0)
    forecastModifier: number; // mapping from category (−1..+5)
    roll2d6: number; // 2..12
    season: Season;
    suggestedDescriptors: string[]; // exactly 3 strings for (season,category)
    total: number; // clamp(roll2d6 + forecastBefore, 2..17)
  };
};

export type WeatherEffects = {
  travelMultiplier: 0.5 | 1 | 2 | 0;
  navCheck: 'normal' | 'disadvantage' | 'impossible';
  exhaustionOnTravel: boolean;
};

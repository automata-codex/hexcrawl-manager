# Scribe Config Library

This directory contains configuration files that define the rules, tables, and data for the Scribe weather and calendar system. Each `.config.ts` file exports a constant used throughout the application. Below is a summary of each config file and its contents:

---

## calendar.config.ts
- **Path:** `cli/commands/scribe/config/calendar.config.ts`
- **Exports:** `CALENDAR_CONFIG: CalendarConfig`
- **Purpose:** Defines the in-game calendar, including:
  - `months`: Array of months (name, days, aliases)
  - `seasonByMonth`: Maps each month to a season
  - `daylightCaps`: Maximum daylight hours per season
  - `displayFormat`: Date display string (informational)
  - `leap`: Leap year rules (every N years, which month, days added)

---

## descriptor-library.config.ts
- **Path:** `cli/commands/scribe/config/descriptor-library.config.ts`
- **Exports:** `DESCRIPTOR_LIBRARY: DescriptorLibrary`
- **Purpose:** Provides descriptive weather phrases for each season and severity category.
  - Structure: `{ season: { category: string[] } }`
  - Example: `DESCRIPTOR_LIBRARY.spring.ideal` gives ideal spring weather phrases.

---

## detail-tables.config.ts
- **Path:** `cli/commands/scribe/config/detail-tables.config.ts`
- **Exports:** `DETAIL_TABLES: DetailTables`
- **Purpose:** Random event tables for inclement and worse weather, per season.
  - Structure: `{ season: { die: string, entries: string[] } }`
  - Example: `DETAIL_TABLES.summer.entries` gives possible summer weather events.

---

## effects-table.config.ts
- **Path:** `cli/commands/scribe/config/effects-table.config.ts`
- **Exports:** `EFFECTS_TABLE: EffectsTable`
- **Purpose:** Maps weather categories to mechanical effects on travel, navigation, and exhaustion.
  - Structure: `{ category: { travelMultiplier: number, navCheck: string, exhaustionOnTravel: boolean } }`

---

## forecast-modifier.config.ts
- **Path:** `cli/commands/scribe/config/forecast-modifier.config.ts`
- **Exports:** `FORECAST_MODIFIER: ForecastModifierTable`
- **Purpose:** Maps weather categories to numeric modifiers for forecasting.
  - Structure: `{ category: number }`

---

## seasonal-bands.config.ts
- **Path:** `cli/commands/scribe/config/seasonal-bands.config.ts`
- **Exports:** `SEASONAL_BANDS: SeasonalBandsTable`
- **Purpose:** Maps dice roll ranges to weather categories for each season.
  - Structure: `{ season: { range: [min, max], category: string }[] }`
  - Example: `SEASONAL_BANDS.winter[0]` gives the range and category for the lowest winter roll.

---

Each config file is intended to be imported and used as a data source for weather, calendar, and travel logic in the Scribe system. See the type definitions in `../types` for details on each structure.

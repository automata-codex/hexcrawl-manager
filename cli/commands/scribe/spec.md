# Skyreach REPL — Day & Time Commands (Spec)

## Goals

* Run the game day by day: start the day, spend time, end the day.
* Track **two envelopes**:

  * **Daylight envelope** (seasonal): how many hours of outdoor travel/exploration fit before nightfall.
  * **Exhaustion envelope** (fixed): total active hours before fatigue checks begin.

## Commands

### `day start [date]`

Opens a new in-game day and anchors it to a calendar date.

* **If `date` is provided:** use it.
* **If omitted:** auto-increment from the most recent `calendarDate` by +1 day.
* **If no prior date exists:** the user must provide a date (prompt in REPL).
* Sets the day’s **seasonal daylight cap** (see Seasons).
* Idempotency/guardrails handled in the REPL (e.g., warn if a day is already open).

**Acceptable date inputs**

* Full: `8 Umbraeus 1511`
* Partial: `8 Umbraeus` (uses current year)
* Relative: `+1`, `-1`
* Month name accepts aliases (e.g., `Umb`, if configured).
* **Leap years:** every 4 years, **Umbraeus** has 31 days (otherwise 30).

**Typical output**

* `📅 Day started: 9 Umbraeus 1511 (daylight cap 9h)`

### `day end`  (alias: `rest`)

Closes the currently open day.

* Computes and displays a brief summary (we can refine later): daylight vs night hours, total active hours.
* Alias `rest` calls the same behavior.

**Typical output**

* `🌙 Day ended (active 9.0h: daylight 6.0h, night 3.0h)`

### `date <new date>`

Corrects or sets the **calendar date** without starting/ending a day.

* If a day is open: updates the day’s `calendarDate` (used for season/daylight cap).
* If no open day: stores the value as the **next** day’s start date (context pointer).
* Same acceptable input formats as `day start`.

**Typical output**

* `📅 Date set to 8 Umbraeus 1511`

### `time <hours>`

Logs active time in **hours** (the REPL handles rounding to 1.5h segments internally).

* Valid user inputs: any positive hour value (tool rounds **up** to nearest 1.5h).
* Each log is classified by the tool as **daylight** or **night** based on the current day’s seasonal cap and how much daylight has already been used.
* This command does not decide *what* the time represents (travel, explore, forage, delve, etc.)—it simply records the passage of time. (Action-specific bells/whistles can layer on later.)

**Typical output**

* `⏱️ Logged: 3.0h (2 segments) — daylight`
* `⏱️ Logged: 1.5h (1 segment) — 🌙 night`

## Envelopes & Seasonal Rules

### Daylight envelope (seasonal)

Hours of outdoor daylight available **before nightfall**. These caps change with the season:

* **Winter:** 6h
* **Spring:** 9h
* **Summer:** 12h
* **Autumn:** 9h

The tool determines the season from the day’s `calendarDate`.

### Exhaustion envelope (fixed)

* **12h** total active time per day before fatigue checks begin.
* Independent of season. You can still act after dark; you just approach this limit.

## Nighttime stance (tool behavior)

* **Overland travel to another hex at night:** **Not allowed** unless on a well-marked, maintained road (tool warns/blocks).
* **Exploring the current hex at night:** **Allowed**. Entries are flagged as **night**; downstream systems may treat this as slower and riskier (table text can be added later).

## Validation & UX Notes (high level)

* **No open day:** `❌ No open day. Start one with: day start [date]`
* **Rounding notice:** `⚠️ Rounded 2.2h → 3.0h (1.5h segments).`
* **Night travel attempt (wilderness):** `🌙 Night travel blocked (road required).`
* **Date typos:** month names accept aliases; when ambiguous, REPL should offer nearest matches.

## Calendar assumptions

* **Custom calendar** with named months (e.g., *Umbraeus*), each with a configured day count.
* **Leap rule:** every 4 years, **Umbraeus** gains +1 day (31 instead of 30).
* Date formatting for display: `D Month YYYY` (e.g., `8 Umbraeus 1511`).

## Minimal lifecycle (at the table)

1. `day start [date?]` → daylight cap set from season.
2. Repeated `time <hours>` during the day → the tool tracks daylight vs night and approaches exhaustion.
3. `day end` / `rest` → wrap up, summarize.

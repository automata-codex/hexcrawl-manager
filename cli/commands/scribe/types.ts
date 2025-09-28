import { PACES } from '@skyreach/schemas';

import type { CalendarService } from './services/calendar.ts';
import type { WeatherDraft } from '@skyreach/core';

export class CalendarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalendarError';
  }
}

export type Context = {
  sessionId: string | null;
  file: string | null; // in-progress file path
  calendar: CalendarService;
  weatherDraft?: WeatherDraft;
  weatherNagPrintedForDates?: Set<string>; // Use strings for easy Set membership
};

export type Pace = (typeof PACES)[number];

export type Tier = 1 | 2 | 3 | 4;


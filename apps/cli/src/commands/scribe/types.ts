import { Interface } from 'node:readline';

import type { CalendarService } from './services/calendar.ts';
import type { WeatherDraft } from '@skyreach/core';
import type { SessionId } from '@skyreach/schemas';

export type Context = {
  calendar: CalendarService;
  file: string | null; // in-progress file path
  rl?: Interface;
  sessionId: SessionId | null;
  weatherDraft?: WeatherDraft;
  weatherNagPrintedForDates?: Set<string>; // Use strings for easy Set membership
};

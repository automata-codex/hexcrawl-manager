import { Interface } from 'node:readline';

import type { CalendarService } from './services/calendar.ts';
import type { WeatherDraft } from '@achm/core';
import type { SessionId } from '@achm/schemas';

export type Context = {
  calendar: CalendarService;
  file: string | null; // in-progress file path
  rl?: Interface;
  sessionId: SessionId | null;
  weatherDraft?: WeatherDraft;
  weatherNagPrintedForDates?: Set<string>; // Use strings for easy Set membership
};

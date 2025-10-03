import { CalendarConfig } from '../types';

export const CALENDAR_CONFIG: CalendarConfig = {
  months: [
    { name: 'Primaris', days: 31, aliases: ['Pri'] },
    { name: 'Gelidus', days: 30, aliases: ['Gel'] },
    { name: 'Hibernis', days: 31, aliases: ['Hib'] },
    { name: 'Vernalis', days: 30, aliases: ['Ver'] },
    { name: 'Pluvoris', days: 31, aliases: ['Plu'] },
    { name: 'Florara', days: 30, aliases: ['Flo'] },
    { name: 'Solinus', days: 31, aliases: ['Sol'] },
    { name: 'Aestara', days: 30, aliases: ['Aes'] },
    { name: 'Lucidus', days: 31, aliases: ['Luc'] },
    { name: 'Fructara', days: 30, aliases: ['Fru'] },
    { name: 'Umbraeus', days: 30, aliases: ['Umb'] },
    { name: 'Aridus', days: 30, aliases: ['Ari'] },
  ],

  // Map each month to a season (example only)
  seasonByMonth: {
    Primaris: 'winter',
    Gelidus: 'winter',
    Hibernis: 'winter',
    Vernalis: 'spring',
    Pluvoris: 'spring',
    Florara: 'spring',
    Solinus: 'summer',
    Aestara: 'summer',
    Lucidus: 'summer',
    Fructara: 'autumn',
    Umbraeus: 'autumn',
    Aridus: 'autumn',
  },

  // Daylight caps per season (hours)
  daylightCaps: {
    winter: 9,
    spring: 12,
    summer: 15,
    autumn: 12,
  },

  // displayFormat currently informational
  displayFormat: 'D Month YYYY',

  leap: {
    every: 4,
    month: 'Umbraeus',
    addDays: 1,
  },
};

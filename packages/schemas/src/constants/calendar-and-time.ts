import { Season } from '../types';

export const SEASON_ORDER: Season[] = ['winter', 'spring', 'summer', 'autumn'];

export const MONTH_NAMES = [
  'Primaris',
  'Gelidus',
  'Hibernis',
  'Vernalis',
  'Pluvoris',
  'Florara',
  'Solinus',
  'Aestara',
  'Lucidus',
  'Fructara',
  'Umbraeus',
  'Aridus',
] as const;

// 1 segment = 0.5 hours (integer math internally)
export const STEP_HOURS = 0.5;

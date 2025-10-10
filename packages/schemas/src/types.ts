import { PACES, PILLARS, TIERS, WEATHER_CATEGORIES } from './constants';

export type Pace = (typeof PACES)[number];

export type Pillar = (typeof PILLARS)[number];

export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

export type Tier = (typeof TIERS)[number];

export type WeatherCategory = (typeof WEATHER_CATEGORIES)[number];

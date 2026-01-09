import type { WeatherCommitted } from '../types.js';

/**
 * Check if weather slows travel times.
 * Returns true if category is "unpleasant," "inclement," or "extreme."
 */
export function slowsTravel(weather: WeatherCommitted): boolean {
  return ['unpleasant', 'inclement', 'extreme'].includes(weather.category);
}

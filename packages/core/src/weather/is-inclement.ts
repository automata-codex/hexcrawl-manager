import type { WeatherCommitted } from '../types';

/**
 * Check if weather is inclement (requires travel time doubler).
 * Returns true if category is Unpleasant, Inclement, or Extreme.
 */
export function isInclement(weather: WeatherCommitted): boolean {
  return ['Unpleasant', 'Inclement', 'Extreme'].includes(weather.category);
}

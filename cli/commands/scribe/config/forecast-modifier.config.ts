import type { ForecastModifierTable } from '../types';

// Forecast Mapping for weather categories
export const FORECAST_MODIFIER: ForecastModifierTable = {
  Ideal:        -1,
  Nice:          0,
  Agreeable:     1,
  Unpleasant:    2,
  Inclement:     3,
  Extreme:       4,
  Catastrophic:  5,
};

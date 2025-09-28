import type { ForecastModifierTable } from '@skyreach/core';

// Forecast Mapping for weather categories
export const FORECAST_MODIFIER: ForecastModifierTable = {
  ideal: -1,
  nice: 0,
  agreeable: 1,
  unpleasant: 2,
  inclement: 3,
  extreme: 4,
  catastrophic: 5,
};

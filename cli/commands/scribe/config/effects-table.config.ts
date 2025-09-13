import type { EffectsTable } from '../types';

// Effects Table for weather categories
export const EFFECTS_TABLE: EffectsTable = {
  Ideal:        { travelMultiplier: 0.5, navCheck: 'normal', exhaustionOnTravel: false },
  Nice:         { travelMultiplier: 1,   navCheck: 'normal', exhaustionOnTravel: false },
  Agreeable:    { travelMultiplier: 1,   navCheck: 'normal', exhaustionOnTravel: false },
  Unpleasant:   { travelMultiplier: 2,   navCheck: 'normal', exhaustionOnTravel: false },
  Inclement:    { travelMultiplier: 2,   navCheck: 'disadvantage', exhaustionOnTravel: false },
  Extreme:      { travelMultiplier: 2,   navCheck: 'disadvantage', exhaustionOnTravel: true },
  Catastrophic: { travelMultiplier: 0,   navCheck: null, exhaustionOnTravel: null },
};

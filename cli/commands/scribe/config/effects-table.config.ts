import type { EffectsTable } from '@skyreach/core';

// Effects Table for weather categories
export const EFFECTS_TABLE: EffectsTable = {
  ideal: {
    travelMultiplier: 0.5,
    navCheck: 'normal',
    exhaustionOnTravel: false,
  },
  nice: { travelMultiplier: 1, navCheck: 'normal', exhaustionOnTravel: false },
  agreeable: {
    travelMultiplier: 1,
    navCheck: 'normal',
    exhaustionOnTravel: false,
  },
  unpleasant: {
    travelMultiplier: 2,
    navCheck: 'normal',
    exhaustionOnTravel: false,
  },
  inclement: {
    travelMultiplier: 2,
    navCheck: 'disadvantage',
    exhaustionOnTravel: false,
  },
  extreme: {
    travelMultiplier: 2,
    navCheck: 'disadvantage',
    exhaustionOnTravel: true,
  },
  catastrophic: {
    travelMultiplier: 0,
    navCheck: 'impossible',
    exhaustionOnTravel: false,
  },
};

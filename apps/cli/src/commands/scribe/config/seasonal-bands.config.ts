import type { SeasonalBandsTable } from '@achm/core';

export const SEASONAL_BANDS: SeasonalBandsTable = {
  spring: [
    { range: [2, 4], category: 'ideal' },
    { range: [5, 7], category: 'nice' },
    { range: [8, 9], category: 'agreeable' },
    { range: [10, 11], category: 'unpleasant' },
    { range: [12, 13], category: 'inclement' },
    { range: [14, 15], category: 'extreme' },
    { range: [16, 17], category: 'catastrophic' },
  ],
  summer: [
    { range: [2, 3], category: 'ideal' },
    { range: [4, 6], category: 'nice' },
    { range: [7, 9], category: 'agreeable' },
    { range: [10, 11], category: 'unpleasant' },
    { range: [12, 13], category: 'inclement' },
    { range: [14, 15], category: 'extreme' },
    { range: [16, 17], category: 'catastrophic' },
  ],
  autumn: [
    { range: [2, 3], category: 'ideal' },
    { range: [4, 6], category: 'nice' },
    { range: [7, 9], category: 'agreeable' },
    { range: [10, 11], category: 'unpleasant' },
    { range: [12, 13], category: 'inclement' },
    { range: [14, 15], category: 'extreme' },
    { range: [16, 17], category: 'catastrophic' },
  ],
  winter: [
    { range: [2, 2], category: 'ideal' },
    { range: [3, 5], category: 'nice' },
    { range: [6, 8], category: 'agreeable' },
    { range: [9, 11], category: 'unpleasant' },
    { range: [12, 13], category: 'inclement' },
    { range: [14, 15], category: 'extreme' },
    { range: [16, 17], category: 'catastrophic' },
  ],
};

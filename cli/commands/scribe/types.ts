export type Context = {
  sessionId: string | null;
  file: string | null;      // in-progress file path
  lastHex: string | null;
  party: string[];
};

export type Pace = 'fast' | 'normal' | 'slow';

export type Pillar = 'explore' | 'social' | 'combat';

export type Tier = 1 | 2 | 3 | 4;

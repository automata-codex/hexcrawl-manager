export type Context = {
  sessionId: string | null;
  file: string | null;      // in-progress file path
  lastHex: string | null;
  party: string[];
};

export type Event = {
  seq: number;              // 1..N within the file
  ts: string;               // ISO timestamp
  kind: string;             // "move" | "scout" | ...
  payload: Record<string, unknown>;
};

export type Pace = 'fast' | 'normal' | 'slow';

export type Pillar = 'explore' | 'social' | 'combat';

export type Tier = 1 | 2 | 3 | 4;
